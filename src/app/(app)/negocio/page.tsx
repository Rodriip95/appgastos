import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { BusinessView } from "@/components/business/BusinessView";
import { GoalsSkeleton } from "@/components/goals/GoalsSkeleton";
import { getBusinessData } from "@/lib/data/business";
import { resolveBalanceView } from "@/lib/finance/balance-view";
import { BUSINESS_TABS, type BusinessTab, type DateRange } from "@/lib/finance/business";
import { isMonthKey, todayKey } from "@/lib/finance/format";

export const metadata: Metadata = { title: "Mi negocio · Bingo" };

export default function BusinessPage({ searchParams }: PageProps<"/negocio">) {
  return (
    <Suspense fallback={<GoalsSkeleton />}>
      <Business searchParams={searchParams} />
    </Suspense>
  );
}

async function Business({ searchParams }: Pick<PageProps<"/negocio">, "searchParams">) {
  const data = await getBusinessData();
  const params = await searchParams;
  await io(); // "hoy" se calcula en cada request
  const today = todayKey();
  const currentMonth = today.slice(0, 7);

  // Misma lógica de vistas que la home, pero sin recordar la elección: abre en el mes.
  const view = resolveBalanceView(params, undefined, today);
  const month = isMonthKey(params.m) && params.m <= currentMonth ? params.m : currentMonth;
  const range: DateRange =
    view.kind === "month"
      ? { from: `${month}-01`, to: `${month}-31` }
      : view.kind === "period"
        ? { from: view.from, to: view.to }
        : { from: null, to: today };
  const tab = BUSINESS_TABS.includes(params.t as BusinessTab) ? (params.t as BusinessTab) : "resumen";

  return (
    <BusinessView
      {...data}
      today={today}
      month={month}
      view={view}
      range={range}
      initialTab={tab}
    />
  );
}
