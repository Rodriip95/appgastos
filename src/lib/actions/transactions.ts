"use server";

import { refresh } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { verifySession } from "@/lib/auth/session";
import { DOC_ID_RE, userCollection } from "@/lib/data/collections";
import type { ActionResult } from "@/lib/finance/types";

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .number("Ingresa un monto válido")
    .positive("El monto debe ser mayor a 0")
    .max(1e12, "Monto demasiado grande"),
  date: z.iso.date("Fecha inválida"),
  categoryId: z.string().regex(DOC_ID_RE).nullable(),
  subcategoryId: z.string().max(64).nullable(),
  note: z.string().trim().max(120, "Descripción muy larga").default(""),
});

export type TransactionInput = z.input<typeof transactionSchema>;

const idSchema = z.string().regex(DOC_ID_RE);
const fail = (error: string): ActionResult => ({ ok: false, error });

type Parsed = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

async function parseAndValidate(uid: string, input: TransactionInput): Promise<Parsed> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const tx = parsed.data;

  // La categoría debe ser del usuario y del mismo tipo; la subcategoría, de esa categoría.
  let subcategoryId: string | null = null;
  if (tx.categoryId) {
    const cat = await userCollection(uid, "categories").doc(tx.categoryId).get();
    if (!cat.exists || cat.get("type") !== tx.type) {
      return { ok: false, error: "La categoría seleccionada no es válida" };
    }
    const subs = (cat.get("subcategories") ?? []) as { id: string }[];
    if (tx.subcategoryId && subs.some((s) => s.id === tx.subcategoryId)) {
      subcategoryId = tx.subcategoryId;
    }
  }

  return {
    ok: true,
    data: {
      ...tx,
      amount: Math.round(tx.amount * 100) / 100,
      month: tx.date.slice(0, 7),
      categoryId: tx.categoryId,
      subcategoryId,
    },
  };
}

export async function createTransaction(input: TransactionInput): Promise<ActionResult> {
  const { uid } = await verifySession();
  try {
    const result = await parseAndValidate(uid, input);
    if (!result.ok) return result;
    await userCollection(uid, "transactions").add({
      ...result.data,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[transactions] create:", error);
    return fail("No pudimos guardar el movimiento");
  }
  refresh();
  return { ok: true };
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Movimiento inválido");
  try {
    const result = await parseAndValidate(uid, input);
    if (!result.ok) return result;
    const ref = userCollection(uid, "transactions").doc(id);
    // Las cuotas de tarjeta se editan como compra completa (lib/actions/cards.ts).
    if ((await ref.get()).get("purchaseId")) return fail("Esta cuota se edita desde la compra");
    await ref.update({ ...result.data, updatedAt: FieldValue.serverTimestamp() });
  } catch (error) {
    console.error("[transactions] update:", error);
    return fail("No pudimos actualizar el movimiento");
  }
  refresh();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Movimiento inválido");
  try {
    await userCollection(uid, "transactions").doc(id).delete();
  } catch (error) {
    console.error("[transactions] delete:", error);
    return fail("No pudimos eliminar el movimiento");
  }
  refresh();
  return { ok: true };
}
