import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { BusinessView } from "@/components/business/BusinessView";
import { GoalsSkeleton } from "@/components/goals/GoalsSkeleton";
import { getBusinessData } from "@/lib/data/business";
import { todayKey } from "@/lib/finance/format";

export const metadata: Metadata = { title: "Emprendimiento · Bingo" };

export default function BusinessPage() {
  return (
    <Suspense fallback={<GoalsSkeleton />}>
      <Business />
    </Suspense>
  );
}

async function Business() {
  const data = await getBusinessData();
  await io(); // "hoy" se calcula en cada request
  return <BusinessView {...data} today={todayKey()} />;
}
