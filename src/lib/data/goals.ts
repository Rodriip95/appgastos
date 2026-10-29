import "server-only";
import { cache } from "react";
import type { DocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { verifySession } from "@/lib/auth/session";
import { userCollection } from "@/lib/data/collections";
import type { Goal, GoalMovement } from "@/lib/finance/types";

function toGoal(doc: DocumentSnapshot): Goal {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    name: d.name ?? "",
    target: Number(d.target) || 0,
    targetDate: d.targetDate ?? null,
    icon: d.icon ?? "piggy-bank",
    color: d.color ?? "emerald",
    saved: Math.round((Number(d.saved) || 0) * 100) / 100,
  };
}

function toMovement(doc: DocumentSnapshot): GoalMovement {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    goalId: d.goalId,
    amount: Number(d.amount) || 0,
    date: d.date,
    month: d.month,
    note: d.note ?? "",
    createdAt: (d.createdAt as Timestamp | undefined)?.toMillis() ?? 0,
  };
}

export const getGoals = cache(async (): Promise<Goal[]> => {
  const { uid } = await verifySession();
  const snap = await userCollection(uid, "goals").orderBy("name").get();
  return snap.docs.map(toGoal);
});

/** Aportes y retiros de un mes (para el balance). */
export async function getMonthGoalMovements(month: string): Promise<GoalMovement[]> {
  const { uid } = await verifySession();
  const snap = await userCollection(uid, "goalMovements").where("month", "==", month).get();
  return snap.docs.map(toMovement);
}

/** Últimos movimientos de todas las metas (historial en /ahorros). */
export async function getRecentGoalMovements(limit = 60): Promise<GoalMovement[]> {
  const { uid } = await verifySession();
  // Orden sobre un solo campo: no requiere índice compuesto.
  const snap = await userCollection(uid, "goalMovements").orderBy("date", "desc").limit(limit).get();
  return snap.docs.map(toMovement);
}
