import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { GoalsSkeleton } from "@/components/goals/GoalsSkeleton";
import { GoalsView } from "@/components/goals/GoalsView";
import { buildDemoGoals } from "@/lib/demo/data";
import { todayKey } from "@/lib/finance/format";

export const metadata: Metadata = { title: "Demo · Ahorros y metas" };

export default function DemoSavingsPage() {
  return (
    <Suspense fallback={<GoalsSkeleton />}>
      <DemoSavings />
    </Suspense>
  );
}

async function DemoSavings() {
  await io();
  const today = todayKey();
  return <GoalsView {...buildDemoGoals(today)} today={today} demo />;
}
