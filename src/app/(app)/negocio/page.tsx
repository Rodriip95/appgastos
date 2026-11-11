import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BusinessHome } from "@/components/business/BusinessHome";
import { GoalsSkeleton } from "@/components/goals/GoalsSkeleton";
import { LEGACY_BUSINESS_TABS } from "@/lib/finance/business";
import { loadBusiness } from "./load";

export const metadata: Metadata = { title: "Mi negocio · Bingo" };

export default function BusinessPage({ searchParams }: PageProps<"/negocio">) {
  return (
    <Suspense fallback={<GoalsSkeleton />}>
      <Business searchParams={searchParams} />
    </Suspense>
  );
}

async function Business({ searchParams }: Pick<PageProps<"/negocio">, "searchParams">) {
  const { data, params, today, month, view, range, query } = await loadBusiness(searchParams);
  // Enlaces viejos con pestaña (`?t=stock`): cada sección tiene ahora su pantalla.
  const legacy = typeof params.t === "string" ? LEGACY_BUSINESS_TABS[params.t] : undefined;
  if (legacy) redirect(`/negocio/${legacy}${query ? `?${query}` : ""}`);

  return <BusinessHome data={data} today={today} month={month} view={view} range={range} query={query} />;
}
