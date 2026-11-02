import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { GoalsSkeleton } from "@/components/goals/GoalsSkeleton";
import { GoalsView } from "@/components/goals/GoalsView";
import { getUsdRate, getUsdReference } from "@/lib/data/fx";
import { getGoals, getRecentGoalMovements } from "@/lib/data/goals";
import { todayKey } from "@/lib/finance/format";

export const metadata: Metadata = { title: "Ahorros y metas · Bingo" };

export default function SavingsPage() {
  return (
    <Suspense fallback={<GoalsSkeleton />}>
      <Savings />
    </Suspense>
  );
}

async function Savings() {
  const [goals, movements] = await Promise.all([getGoals(), getRecentGoalMovements()]);
  // La cotización solo hace falta para sumar metas en pesos y en dólares en un mismo avance.
  const usdRate = goals.some((g) => g.currency === "USD") ? await getUsdReference().then(getUsdRate) : null;
  await io(); // "hoy" se calcula en cada request
  return <GoalsView goals={goals} movements={movements} today={todayKey()} usdRate={usdRate} />;
}
