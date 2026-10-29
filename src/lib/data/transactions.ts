import "server-only";
import type { QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { verifySession } from "@/lib/auth/session";
import { userCollection } from "@/lib/data/collections";
import type { Transaction } from "@/lib/finance/types";

export function toTransaction(doc: QueryDocumentSnapshot): Transaction {
  const d = doc.data();
  return {
    id: doc.id,
    type: d.type === "income" ? "income" : "expense",
    amount: Number(d.amount) || 0,
    date: d.date,
    month: d.month,
    categoryId: d.categoryId ?? null,
    subcategoryId: d.subcategoryId ?? null,
    note: d.note ?? "",
    recurring: d.recurring === true,
    cardId: d.cardId ?? null,
    purchaseId: d.purchaseId ?? null,
    installment: d.installment ?? null,
    createdAt: (d.createdAt as Timestamp | undefined)?.toMillis() ?? 0,
  };
}

/** Movimientos de un mes, del más reciente al más antiguo. */
export async function getMonthTransactions(month: string): Promise<Transaction[]> {
  const { uid } = await verifySession();
  // Filtro por igualdad + orden en memoria: no requiere índice compuesto.
  const snap = await userCollection(uid, "transactions").where("month", "==", month).get();
  return snap.docs
    .map(toTransaction)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

/** Primer mes con movimientos (límite para navegar hacia atrás). */
export async function getFirstActivityMonth(): Promise<string | null> {
  const { uid } = await verifySession();
  const snap = await userCollection(uid, "transactions").orderBy("month").limit(1).get();
  return snap.empty ? null : (snap.docs[0].get("month") as string);
}

/** Cuotas de tarjeta desde `fromMonth` en adelante (para próximos resúmenes). */
export async function getUpcomingCardTransactions(fromMonth: string): Promise<Transaction[]> {
  const { uid } = await verifySession();
  // Rango sobre un solo campo: no requiere índice compuesto. La tarjeta se filtra en memoria.
  const snap = await userCollection(uid, "transactions").where("month", ">=", fromMonth).get();
  return snap.docs
    .map(toTransaction)
    .filter((t) => t.cardId)
    .sort((a, b) => a.date.localeCompare(b.date));
}
