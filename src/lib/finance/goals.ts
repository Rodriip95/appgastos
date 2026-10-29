import type { Goal, GoalMovement } from "@/lib/finance/types";

// Lógica pura de metas de ahorro, usable en servidor y cliente.

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Avance de la meta, 0–100. */
export const goalPct = (goal: Goal) => (goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0);

export const goalRemaining = (goal: Goal) => round2(Math.max(goal.target - goal.saved, 0));

/** Meses que faltan hasta la fecha objetivo (mínimo 1); null si no tiene fecha. */
export function monthsLeft(targetDate: string | null, today: string): number | null {
  if (!targetDate) return null;
  const [ty, tm] = targetDate.split("-").map(Number);
  const [y, m] = today.split("-").map(Number);
  return Math.max((ty - y) * 12 + (tm - m), 1);
}

export type GoalPlan =
  | { kind: "done" }
  | { kind: "no-date" }
  | { kind: "overdue"; remaining: number }
  | { kind: "monthly"; perMonth: number; months: number };

/** Cuánto hay que apartar por mes para llegar a tiempo. */
export function goalPlan(goal: Goal, today: string): GoalPlan {
  const remaining = goalRemaining(goal);
  if (remaining <= 0) return { kind: "done" };
  if (!goal.targetDate) return { kind: "no-date" };
  if (goal.targetDate < today) return { kind: "overdue", remaining };
  const months = monthsLeft(goal.targetDate, today)!;
  return { kind: "monthly", perMonth: Math.ceil(remaining / months), months };
}

/** Neto apartado (aportes − retiros) en una lista de movimientos. */
export const netSaved = (movements: GoalMovement[]) =>
  round2(movements.reduce((sum, m) => sum + m.amount, 0));

/** Metas sugeridas para empezar. */
export const SUGGESTED_GOALS: Pick<Goal, "name" | "icon" | "color">[] = [
  { name: "Fondo de emergencia", icon: "piggy-bank", color: "emerald" },
  { name: "Vacaciones", icon: "plane", color: "sky" },
  { name: "Auto nuevo", icon: "car", color: "blue" },
  { name: "Casa propia", icon: "house", color: "orange" },
  { name: "Estudios", icon: "graduation-cap", color: "indigo" },
];
