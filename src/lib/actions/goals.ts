"use server";

import { refresh } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { verifySession } from "@/lib/auth/session";
import { DOC_ID_RE, userCollection } from "@/lib/data/collections";
import { COLOR_KEYS, ICON_KEYS } from "@/lib/finance/catalog";
import { formatMoney } from "@/lib/finance/format";
import type { ActionResult } from "@/lib/finance/types";

const goalSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre a la meta").max(40, "Nombre muy largo"),
  target: z.number("Ingresa un monto válido").positive("El objetivo debe ser mayor a 0").max(1e12),
  targetDate: z.iso.date("Fecha inválida").nullable(),
  icon: z.enum(ICON_KEYS),
  color: z.enum(COLOR_KEYS),
});

export type GoalInput = z.input<typeof goalSchema>;

const movementSchema = z.object({
  goalId: z.string().regex(DOC_ID_RE),
  kind: z.enum(["deposit", "withdraw"]),
  amount: z.number("Ingresa un monto válido").positive("El monto debe ser mayor a 0").max(1e12),
  date: z.iso.date("Fecha inválida"),
  note: z.string().trim().max(120, "Descripción muy larga").default(""),
});

export type GoalMovementInput = z.input<typeof movementSchema>;

const idSchema = z.string().regex(DOC_ID_RE);
const fail = (error: string): ActionResult => ({ ok: false, error });
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function saveGoal(input: GoalInput, id?: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (id !== undefined && !idSchema.safeParse(id).success) return fail("Meta inválida");

  const col = userCollection(uid, "goals");
  try {
    if (id) {
      const ref = col.doc(id);
      if (!(await ref.get()).exists) return fail("La meta ya no existe");
      // `saved` no se toca aquí: solo cambia con aportes y retiros.
      await ref.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });
    } else {
      await col.add({ ...parsed.data, saved: 0, createdAt: FieldValue.serverTimestamp() });
    }
  } catch (error) {
    console.error("[goals] save:", error);
    return fail("No pudimos guardar la meta");
  }
  refresh();
  return { ok: true };
}

/** Elimina la meta y su historial de aportes. */
export async function deleteGoal(id: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Meta inválida");
  try {
    const goals = userCollection(uid, "goals");
    const movements = await userCollection(uid, "goalMovements").where("goalId", "==", id).get();
    const batch = goals.firestore.batch();
    movements.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(goals.doc(id));
    await batch.commit();
  } catch (error) {
    console.error("[goals] delete:", error);
    return fail("No pudimos eliminar la meta");
  }
  refresh();
  return { ok: true };
}

/** Aporta o retira dinero de una meta; `saved` se actualiza en la misma transacción. */
export async function addGoalMovement(input: GoalMovementInput): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { goalId, kind, amount, date, note } = parsed.data;
  const signed = round2(kind === "deposit" ? amount : -amount);

  const goalRef = userCollection(uid, "goals").doc(goalId);
  const movementRef = userCollection(uid, "goalMovements").doc();
  try {
    const error = await goalRef.firestore.runTransaction(async (tx) => {
      const goal = await tx.get(goalRef);
      if (!goal.exists) return "La meta ya no existe";
      const saved = Number(goal.get("saved")) || 0;
      if (saved + signed < -0.001) return `Solo hay ${formatMoney(saved)} reservados en esta meta`;
      tx.set(movementRef, {
        goalId,
        amount: signed,
        date,
        month: date.slice(0, 7),
        note,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(goalRef, { saved: round2(saved + signed) });
      return null;
    });
    if (error) return fail(error);
  } catch (error) {
    console.error("[goals] movement:", error);
    return fail("No pudimos registrar el movimiento");
  }
  refresh();
  return { ok: true };
}

/** Deshace un aporte o retiro. */
export async function deleteGoalMovement(id: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Movimiento inválido");
  const movementRef = userCollection(uid, "goalMovements").doc(id);
  try {
    await movementRef.firestore.runTransaction(async (tx) => {
      const movement = await tx.get(movementRef);
      if (!movement.exists) return;
      const goalRef = userCollection(uid, "goals").doc(movement.get("goalId"));
      const goal = await tx.get(goalRef);
      if (goal.exists) {
        const saved = Number(goal.get("saved")) || 0;
        tx.update(goalRef, { saved: round2(Math.max(0, saved - Number(movement.get("amount")))) });
      }
      tx.delete(movementRef);
    });
  } catch (error) {
    console.error("[goals] delete movement:", error);
    return fail("No pudimos eliminar el movimiento");
  }
  refresh();
  return { ok: true };
}
