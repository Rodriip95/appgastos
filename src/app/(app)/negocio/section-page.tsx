import { Suspense } from "react";
import { BusinessSectionView, type BusinessSectionName } from "@/components/business/BusinessSections";
import { GoalsSkeleton } from "@/components/goals/GoalsSkeleton";
import { loadBusiness } from "./load";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Página de una sección de Mi negocio (`/negocio/<sección>`); los datos son los mismos que la principal. */
export function SectionPage({ section, searchParams }: { section: BusinessSectionName; searchParams: SearchParams }) {
  return (
    <Suspense fallback={<GoalsSkeleton />}>
      <Section section={section} searchParams={searchParams} />
    </Suspense>
  );
}

async function Section({ section, searchParams }: { section: BusinessSectionName; searchParams: SearchParams }) {
  const { data, today, month, view, range, query } = await loadBusiness(searchParams);
  return (
    <BusinessSectionView
      section={section}
      data={data}
      today={today}
      month={month}
      view={view}
      range={range}
      query={query}
    />
  );
}
