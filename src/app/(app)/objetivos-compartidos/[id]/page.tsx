import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { GoalSpaceView } from "@/components/shared/GoalSpaceView";
import { Skeleton } from "@/components/ui/skeleton";
import { getContactsOverview } from "@/lib/data/contacts";
import { getSharedDetail } from "@/lib/data/shared";
import { todayKey } from "@/lib/finance/format";

export const metadata: Metadata = { title: "Objetivo compartido · Bingo" };

export default function SharedGoalPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<GoalSkeleton />}>
      <SharedGoal params={params} />
    </Suspense>
  );
}

async function SharedGoal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, { contacts }] = await Promise.all([getSharedDetail(id, "goal"), getContactsOverview()]);
  if (!detail) notFound();
  await io(); // "hoy" se calcula en cada request
  return <GoalSpaceView {...detail} contacts={contacts} today={todayKey()} />;
}

function GoalSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-16 w-72" />
      <Skeleton className="h-52 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  );
}
