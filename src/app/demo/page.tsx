import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { buildDemoData, buildDemoGoals } from "@/lib/demo/data";
import { isMonthKey, todayKey } from "@/lib/finance/format";

export const metadata: Metadata = { title: "Demo · Mis Gastos" };

/** Recorrido completo de la app con datos ficticios: sin login y sin guardar nada. */
export default function DemoPage({ searchParams }: PageProps<"/demo">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DemoDashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function DemoDashboard({ searchParams }: Pick<PageProps<"/demo">, "searchParams">) {
  const { m, c } = await searchParams;
  await io();
  const today = todayKey();
  const currentMonth = today.slice(0, 7);
  const month = isMonthKey(m) && m <= currentMonth ? m : currentMonth;

  const { goals, movements } = buildDemoGoals(today);

  return (
    <DashboardView
      {...buildDemoData(month, today)}
      goals={goals}
      goalMovements={movements.filter((m) => m.month === month)}
      month={month}
      currentMonth={currentMonth}
      today={today}
      filterKey={typeof c === "string" ? c : null}
      basePath="/demo"
      demo
    />
  );
}
