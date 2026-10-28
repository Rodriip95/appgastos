"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { verifySession } from "@/lib/auth/session";
import { toCard } from "@/lib/data/cards";
import { DOC_ID_RE, userCollection } from "@/lib/data/collections";
import { installmentSchedule } from "@/lib/finance/cards";
import { COLOR_KEYS } from "@/lib/finance/catalog";
import type { ActionResult } from "@/lib/finance/types";

const day = (label: string) =>
  z.number(`Elige el día de ${label}`).int().min(1, `Día de ${label} inválido`).max(31, `Día de ${label} inválido`);

const cardSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre a la tarjeta").max(30, "Nombre muy largo"),
  closingDay: day("cierre"),
  dueDay: day("vencimiento"),
  color: z.enum(COLOR_KEYS),
});

export type CardInput = z.input<typeof cardSchema>;

const purchaseSchema = z.object({
  cardId: z.string().regex(DOC_ID_RE, "Elige una tarjeta"),
  amount: z
    .number("Ingresa un monto válido")
    .positive("El monto debe ser mayor a 0")
    .max(1e12, "Monto demasiado grande"),
  installments: z.number().int().min(1, "Mínimo 1 cuota").max(48, "Máximo 48 cuotas"),
  date: z.iso.date("Fecha inválida"),
  categoryId: z.string().regex(DOC_ID_RE).nullable(),
  subcategoryId: z.string().max(64).nullable(),
  note: z.string().trim().max(120, "Descripción muy larga").default(""),
});

export type CardPurchaseInput = z.input<typeof purchaseSchema>;

const purchaseEditSchema = purchaseSchema.pick({ categoryId: true, subcategoryId: true, note: true });

export type CardPurchaseEditInput = z.input<typeof purchaseEditSchema>;

const idSchema = z.string().regex(DOC_ID_RE);
const fail = (error: string): ActionResult => ({ ok: false, error });

export async function saveCard(input: CardInput, id?: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = cardSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (id !== undefined && !idSchema.safeParse(id).success) return fail("Tarjeta inválida");

  const col = userCollection(uid, "cards");
  try {
    if (id) {
      const ref = col.doc(id);
      if (!(await ref.get()).exists) return fail("La tarjeta ya no existe");
      // Las cuotas ya cargadas conservan su fecha; los cambios aplican a compras nuevas.
      await ref.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });
    } else {
      await col.add({ ...parsed.data, createdAt: FieldValue.serverTimestamp() });
    }
  } catch (error) {
    console.error("[cards] save:", error);
    return fail("No pudimos guardar la tarjeta");
  }
  refresh();
  return { ok: true };
}

export async function deleteCard(id: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Tarjeta inválida");
  try {
    // Las cuotas ya cargadas se conservan como gastos (sin la tarjeta asociada).
    await userCollection(uid, "cards").doc(id).delete();
  } catch (error) {
    console.error("[cards] delete:", error);
    return fail("No pudimos eliminar la tarjeta");
  }
  refresh();
  return { ok: true };
}

/** Subcategoría válida si la categoría es de gastos y del usuario; si no, error. */
async function checkCategory(
  uid: string,
  categoryId: string | null,
  subcategoryId: string | null,
): Promise<{ ok: true; subcategoryId: string | null } | { ok: false; error: string }> {
  if (!categoryId) return { ok: true, subcategoryId: null };
  const cat = await userCollection(uid, "categories").doc(categoryId).get();
  if (!cat.exists || cat.get("type") !== "expense") {
    return { ok: false, error: "La categoría seleccionada no es válida" };
  }
  const subs = (cat.get("subcategories") ?? []) as { id: string }[];
  return { ok: true, subcategoryId: subcategoryId && subs.some((s) => s.id === subcategoryId) ? subcategoryId : null };
}

/**
 * Registra una compra con tarjeta: crea un gasto por cuota, fechado en el
 * vencimiento del resumen que la cobra. Todas comparten `purchaseId`.
 */
export async function createCardPurchase(
  input: CardPurchaseInput,
): Promise<ActionResult & { firstMonth?: string }> {
  const { uid } = await verifySession();
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const p = parsed.data;

  let firstMonth: string;
  try {
    const cardDoc = await userCollection(uid, "cards").doc(p.cardId).get();
    if (!cardDoc.exists) return fail("La tarjeta seleccionada no existe");
    const category = await checkCategory(uid, p.categoryId, p.subcategoryId);
    if (!category.ok) return category;

    const schedule = installmentSchedule(toCard(cardDoc), p.date, p.amount, p.installments);
    firstMonth = schedule[0].month;
    const purchaseId = randomUUID();
    const col = userCollection(uid, "transactions");
    const batch = col.firestore.batch();
    for (const cuota of schedule) {
      batch.set(col.doc(), {
        type: "expense",
        amount: cuota.amount,
        date: cuota.date,
        month: cuota.month,
        categoryId: p.categoryId,
        subcategoryId: category.subcategoryId,
        note: p.note,
        cardId: p.cardId,
        purchaseId,
        purchaseDate: p.date,
        installment: { n: cuota.n, total: cuota.total },
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    console.error("[cards] purchase:", error);
    return fail("No pudimos guardar la compra");
  }
  refresh();
  return { ok: true, firstMonth };
}

/** Cambia categoría y descripción en todas las cuotas de una compra. */
export async function updateCardPurchase(
  purchaseId: string,
  input: CardPurchaseEditInput,
): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = purchaseEditSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (!z.uuid().safeParse(purchaseId).success) return fail("Compra inválida");

  try {
    const category = await checkCategory(uid, parsed.data.categoryId, parsed.data.subcategoryId);
    if (!category.ok) return category;
    const snap = await userCollection(uid, "transactions").where("purchaseId", "==", purchaseId).get();
    if (snap.empty) return fail("La compra ya no existe");
    const batch = snap.query.firestore.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        categoryId: parsed.data.categoryId,
        subcategoryId: category.subcategoryId,
        note: parsed.data.note,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    console.error("[cards] update purchase:", error);
    return fail("No pudimos actualizar la compra");
  }
  refresh();
  return { ok: true };
}

/** Elimina todas las cuotas de una compra. */
export async function deleteCardPurchase(purchaseId: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!z.uuid().safeParse(purchaseId).success) return fail("Compra inválida");
  try {
    const snap = await userCollection(uid, "transactions").where("purchaseId", "==", purchaseId).get();
    const batch = snap.query.firestore.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
  } catch (error) {
    console.error("[cards] delete purchase:", error);
    return fail("No pudimos eliminar la compra");
  }
  refresh();
  return { ok: true };
}
