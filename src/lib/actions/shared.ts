"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { verifySession, type SessionUser } from "@/lib/auth/session";
import { DOC_ID_RE, sharedCollection, userCollection } from "@/lib/data/collections";
import { toSpace } from "@/lib/data/shared";
import { COLOR_KEYS, ICON_KEYS } from "@/lib/finance/catalog";
import { splitEqual, toCents } from "@/lib/finance/shared";
import type { ActionResult } from "@/lib/finance/types";

const idSchema = z.string().regex(DOC_ID_RE);
const fail = (error: string): ActionResult => ({ ok: false, error });
const MAX_AMOUNT = 1e9;

const subNames = z
  .array(z.string().trim().min(1).max(30, "Subcategoría muy larga"))
  .max(20, "Máximo 20 subcategorías");

const spaceSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre").max(40, "Nombre muy largo"),
  icon: z.enum(ICON_KEYS),
  color: z.enum(COLOR_KEYS),
});

export type SpaceInput = z.input<typeof spaceSchema> & {
  /** Subcategorías (conceptos, en un objetivo); las que ya existen conservan su `id` */
  subcategories: { id?: string; name: string }[];
  /** Solo en objetivos: monto a juntar y fecha límite opcional */
  target?: number;
  targetDate?: string | null;
};

const goalSchema = z.object({
  target: z.number("Ingresa el monto a juntar").positive("El objetivo debe ser mayor a 0").max(MAX_AMOUNT),
  targetDate: z.iso.date("Fecha inválida").nullable(),
});

/** Datos propios de un objetivo, o un error si faltan. */
function goalFields(input: SpaceInput) {
  const parsed = goalSchema.safeParse({ target: input.target, targetDate: input.targetDate ?? null });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", goal: null };
  return { error: null, goal: { targetCents: toCents(parsed.data.target), targetDate: parsed.data.targetDate } };
}

const personOf = (user: SessionUser) => ({
  name: user.name ?? user.email?.split("@")[0] ?? "",
  email: user.email ?? "",
  photo: user.picture,
});

function cleanSubcategories(input: SpaceInput["subcategories"]) {
  const names = subNames.safeParse(input.map((s) => s.name));
  if (!names.success) return { error: names.error.issues[0]?.message ?? "Subcategorías inválidas", subs: [] };
  const seen = new Set<string>();
  const subs = input
    .map((s, i) => ({ id: s.id && DOC_ID_RE.test(s.id) ? s.id : randomUUID(), name: names.data[i] }))
    .filter((s) => {
      const key = s.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return { error: null, subs };
}

/** Devuelve los datos de mis contactos entre `uids`, o un error si alguno no lo es. */
async function contactsAmong(myUid: string, uids: string[]) {
  const unique = [...new Set(uids)].filter((u) => u !== myUid);
  if (!unique.every((u) => DOC_ID_RE.test(u))) return { error: "Contacto inválido", people: [] };
  const docs = await Promise.all(unique.map((u) => userCollection(myUid, "contacts").doc(u).get()));
  if (docs.some((d) => !d.exists)) return { error: "Solo puedes invitar a tus contactos", people: [] };
  return {
    error: null,
    people: docs.map((d) => ({
      uid: d.id,
      name: d.get("name") ?? "",
      email: d.get("email") ?? "",
      photo: d.get("photo") ?? null,
    })),
  };
}

/** Carga el espacio y comprueba que `uid` participa con el estado pedido. */
async function loadSpace(spaceId: string, uid: string, status: "accepted" | "pending" = "accepted") {
  if (!idSchema.safeParse(spaceId).success) return null;
  const ref = sharedCollection().doc(spaceId);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const space = toSpace(doc);
  if (space.members.find((m) => m.uid === uid)?.status !== status) return null;
  return { ref, space };
}

const pendingMember = (p: { name: string; email: string; photo: string | null }) => ({ ...p, status: "pending" });

export async function createSharedSpace(
  kind: "expenses" | "goal",
  input: SpaceInput,
  invite: string[],
): Promise<ActionResult> {
  const me = await verifySession();
  const parsed = spaceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const cleaned = cleanSubcategories(input.subcategories);
  if (cleaned.error) return fail(cleaned.error);
  const goal = kind === "goal" ? goalFields(input) : null;
  if (goal?.error) return fail(goal.error);

  try {
    const contacts = await contactsAmong(me.uid, invite);
    if (contacts.error) return fail(contacts.error);

    await sharedCollection().add({
      kind,
      ...(goal && { goal: goal.goal }),
      ...parsed.data,
      createdBy: me.uid,
      subcategories: cleaned.subs,
      memberIds: [me.uid, ...contacts.people.map((p) => p.uid)],
      members: {
        [me.uid]: { ...personOf(me), status: "accepted" },
        ...Object.fromEntries(contacts.people.map((p) => [p.uid, pendingMember(p)])),
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[shared] create:", error);
    return fail("No pudimos crear el espacio");
  }
  refresh();
  return { ok: true };
}

export async function updateSharedSpace(id: string, input: SpaceInput): Promise<ActionResult> {
  const me = await verifySession();
  const parsed = spaceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const cleaned = cleanSubcategories(input.subcategories);
  if (cleaned.error) return fail(cleaned.error);

  try {
    const found = await loadSpace(id, me.uid);
    if (!found) return fail("El espacio ya no está disponible");
    const goal = found.space.kind === "goal" ? goalFields(input) : null;
    if (goal?.error) return fail(goal.error);
    // Las subcategorías quitadas dejan sus movimientos como "Sin subcategoría".
    await found.ref.update({ ...parsed.data, subcategories: cleaned.subs, ...(goal && { goal: goal.goal }) });
  } catch (error) {
    console.error("[shared] update:", error);
    return fail("No pudimos guardar los cambios");
  }
  refresh();
  return { ok: true };
}

/** Invita contactos a un espacio (o los vuelve a invitar si se habían ido). */
export async function inviteToSharedSpace(id: string, invite: string[]): Promise<ActionResult> {
  const me = await verifySession();
  try {
    const found = await loadSpace(id, me.uid);
    if (!found) return fail("El espacio ya no está disponible");
    const contacts = await contactsAmong(me.uid, invite);
    if (contacts.error) return fail(contacts.error);

    const current = new Map(found.space.members.map((m) => [m.uid, m.status]));
    const fresh = contacts.people.filter((p) => !current.has(p.uid) || current.get(p.uid) === "left");
    if (fresh.length === 0) return fail("Esas personas ya participan");

    await found.ref.update({
      memberIds: FieldValue.arrayUnion(...fresh.map((p) => p.uid)),
      ...Object.fromEntries(fresh.map((p) => [`members.${p.uid}`, pendingMember(p)])),
    });
  } catch (error) {
    console.error("[shared] invite:", error);
    return fail("No pudimos enviar la invitación");
  }
  refresh();
  return { ok: true };
}

export async function respondSharedInvite(id: string, accept: boolean): Promise<ActionResult> {
  const me = await verifySession();
  try {
    const found = await loadSpace(id, me.uid, "pending");
    if (!found) return fail("La invitación ya no está disponible");
    if (accept) {
      await found.ref.update({ [`members.${me.uid}`]: { ...personOf(me), status: "accepted" } });
    } else {
      await found.ref.update({
        memberIds: FieldValue.arrayRemove(me.uid),
        [`members.${me.uid}`]: FieldValue.delete(),
      });
    }
  } catch (error) {
    console.error("[shared] respond:", error);
    return fail("No pudimos responder la invitación");
  }
  refresh();
  return { ok: true };
}

/** Borra el espacio completo cuando ya no queda nadie que lo use. */
async function deleteSpaceTree(ref: FirebaseFirestore.DocumentReference) {
  await ref.firestore.recursiveDelete(ref);
}

/** Sale del espacio; el historial se conserva. Si era la última persona, se borra todo. */
export async function leaveSharedSpace(id: string): Promise<ActionResult> {
  const me = await verifySession();
  try {
    const found = await loadSpace(id, me.uid);
    if (!found) return fail("El espacio ya no está disponible");
    const othersActive = found.space.members.some((m) => m.uid !== me.uid && m.status === "accepted");
    const othersPending = found.space.members.some((m) => m.uid !== me.uid && m.status === "pending");
    if (!othersActive && !othersPending) {
      await deleteSpaceTree(found.ref);
    } else {
      await found.ref.update({
        memberIds: FieldValue.arrayRemove(me.uid),
        [`members.${me.uid}.status`]: "left",
      });
    }
  } catch (error) {
    console.error("[shared] leave:", error);
    return fail("No pudimos salir del espacio");
  }
  refresh();
  return { ok: true };
}

/** Quien creó el espacio puede quitar a otro participante. */
export async function removeSharedMember(id: string, uid: string): Promise<ActionResult> {
  const me = await verifySession();
  if (!idSchema.safeParse(uid).success) return fail("Participante inválido");
  try {
    const found = await loadSpace(id, me.uid);
    if (!found || found.space.createdBy !== me.uid) return fail("Solo quien creó el espacio puede quitar personas");
    if (uid === me.uid) return fail("Usa “Salir” para irte del espacio");
    const target = found.space.members.find((m) => m.uid === uid);
    if (!target) return fail("Esa persona ya no participa");
    await found.ref.update({
      memberIds: FieldValue.arrayRemove(uid),
      // Una invitación pendiente se borra; quien ya participó queda como ex-integrante.
      [`members.${uid}`]:
        target.status === "pending" ? FieldValue.delete() : { ...target, status: "left" },
    });
  } catch (error) {
    console.error("[shared] remove member:", error);
    return fail("No pudimos quitar a la persona");
  }
  refresh();
  return { ok: true };
}

export async function deleteSharedSpace(id: string): Promise<ActionResult> {
  const me = await verifySession();
  try {
    const found = await loadSpace(id, me.uid);
    if (!found || found.space.createdBy !== me.uid) return fail("Solo quien creó el espacio puede eliminarlo");
    await deleteSpaceTree(found.ref);
  } catch (error) {
    console.error("[shared] delete:", error);
    return fail("No pudimos eliminar el espacio");
  }
  refresh();
  return { ok: true };
}

const entryBase = {
  spaceId: idSchema,
  paidBy: idSchema,
  amount: z.number("Ingresa un monto válido").positive("El monto debe ser mayor a 0").max(MAX_AMOUNT),
  date: z.iso.date("Fecha inválida"),
  note: z.string().trim().max(120, "Descripción muy larga").default(""),
};

const expenseSchema = z.object({
  ...entryBase,
  subcategoryId: z.string().nullable(),
  /** "equal": entre todos los participantes; si no, el uid de quien se lo queda entero */
  splitWith: z.union([z.literal("equal"), idSchema]),
});

const settlementSchema = z.object({ ...entryBase, toUid: idSchema });

export type SharedExpenseInput = z.input<typeof expenseSchema>;
export type SharedSettlementInput = z.input<typeof settlementSchema>;

export async function addSharedExpense(input: SharedExpenseInput): Promise<ActionResult> {
  const me = await verifySession();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { spaceId, paidBy, amount, date, note, subcategoryId, splitWith } = parsed.data;

  try {
    const found = await loadSpace(spaceId, me.uid);
    if (!found || found.space.kind !== "expenses") return fail("El espacio ya no está disponible");
    const active = found.space.members.filter((m) => m.status === "accepted").map((m) => m.uid);
    if (!active.includes(paidBy)) return fail("Quien pagó no participa en el espacio");
    if (splitWith !== "equal" && !active.includes(splitWith)) return fail("El reparto incluye a alguien que no participa");
    if (subcategoryId && !found.space.subcategories.some((s) => s.id === subcategoryId)) {
      return fail("Subcategoría inválida");
    }

    const amountCents = toCents(amount);
    await found.ref.collection("entries").add({
      type: "expense",
      paidBy,
      amountCents,
      date,
      month: date.slice(0, 7),
      subcategoryId: subcategoryId || null,
      note,
      split: splitWith === "equal" ? splitEqual(amountCents, active) : { [splitWith]: amountCents },
      createdBy: me.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[shared] add expense:", error);
    return fail("No pudimos registrar el gasto");
  }
  refresh();
  return { ok: true };
}

/** Registra que `paidBy` le pasó dinero a `toUid` para equilibrar el balance. */
export async function addSharedSettlement(input: SharedSettlementInput): Promise<ActionResult> {
  const me = await verifySession();
  const parsed = settlementSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { spaceId, paidBy, toUid, amount, date, note } = parsed.data;
  if (paidBy === toUid) return fail("Elige dos personas distintas");

  try {
    const found = await loadSpace(spaceId, me.uid);
    if (!found || found.space.kind !== "expenses") return fail("El espacio ya no está disponible");
    const active = found.space.members.filter((m) => m.status === "accepted").map((m) => m.uid);
    if (!active.includes(paidBy) || !active.includes(toUid)) return fail("Esa persona no participa en el espacio");

    const amountCents = toCents(amount);
    await found.ref.collection("entries").add({
      type: "settlement",
      paidBy,
      amountCents,
      date,
      month: date.slice(0, 7),
      subcategoryId: null,
      note,
      split: { [toUid]: amountCents },
      createdBy: me.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[shared] add settlement:", error);
    return fail("No pudimos registrar el pago");
  }
  refresh();
  return { ok: true };
}

const contributionSchema = z.object({
  ...entryBase,
  kind: z.enum(["deposit", "withdrawal"]),
  subcategoryId: z.string().nullable(),
});

export type GoalContributionInput = z.input<typeof contributionSchema>;

/** Suma de aportes menos retiros guardados en un objetivo, en centavos. */
async function savedIn(ref: FirebaseFirestore.DocumentReference, skipEntryId?: string) {
  const docs = (await ref.collection("entries").get()).docs.filter((d) => d.id !== skipEntryId);
  return docs.reduce((sum, d) => {
    const cents = Number(d.get("amountCents")) || 0;
    return sum + (d.get("type") === "deposit" ? cents : d.get("type") === "withdrawal" ? -cents : 0);
  }, 0);
}

/** Aporta (o retira) dinero de un objetivo compartido. */
export async function addGoalContribution(input: GoalContributionInput): Promise<ActionResult> {
  const me = await verifySession();
  const parsed = contributionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { spaceId, paidBy, kind, amount, date, note, subcategoryId } = parsed.data;

  try {
    const found = await loadSpace(spaceId, me.uid);
    if (!found || found.space.kind !== "goal") return fail("El objetivo ya no está disponible");
    const active = found.space.members.filter((m) => m.status === "accepted").map((m) => m.uid);
    if (!active.includes(paidBy)) return fail("Esa persona no participa en el objetivo");
    if (subcategoryId && !found.space.subcategories.some((s) => s.id === subcategoryId)) {
      return fail("Concepto inválido");
    }

    const amountCents = toCents(amount);
    if (kind === "withdrawal" && (await savedIn(found.ref)) < amountCents) {
      return fail("No hay tanto reservado en este objetivo");
    }
    await found.ref.collection("entries").add({
      type: kind,
      paidBy,
      amountCents,
      date,
      month: date.slice(0, 7),
      subcategoryId: subcategoryId || null,
      note,
      split: {},
      createdBy: me.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[shared] contribution:", error);
    return fail("No pudimos registrar el movimiento");
  }
  refresh();
  return { ok: true };
}

/** Cada uno puede borrar lo que cargó. */
export async function deleteSharedEntry(spaceId: string, entryId: string): Promise<ActionResult> {
  const me = await verifySession();
  if (!idSchema.safeParse(entryId).success) return fail("Movimiento inválido");
  try {
    const found = await loadSpace(spaceId, me.uid);
    if (!found) return fail("El espacio ya no está disponible");
    const ref = found.ref.collection("entries").doc(entryId);
    const entry = await ref.get();
    if (!entry.exists) return { ok: true };
    if (entry.get("createdBy") !== me.uid) return fail("Solo puede borrarlo quien lo cargó");
    // Borrar un aporte no puede dejar el objetivo con menos de cero reservado.
    if (entry.get("type") === "deposit" && (await savedIn(found.ref, entryId)) < 0) {
      return fail("Hay retiros que dependen de este aporte");
    }
    await ref.delete();
  } catch (error) {
    console.error("[shared] delete entry:", error);
    return fail("No pudimos eliminar el movimiento");
  }
  refresh();
  return { ok: true };
}
