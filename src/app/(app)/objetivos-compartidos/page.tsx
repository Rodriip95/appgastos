import { Suspense } from "react";
import type { Metadata } from "next";
import { GoalListView } from "@/components/shared/GoalListView";
import { Skeleton } from "@/components/ui/skeleton";
import { getContactsOverview } from "@/lib/data/contacts";
import { getSharedOverview } from "@/lib/data/shared";

export const metadata: Metadata = { title: "Objetivos compartidos · Bingo" };

export default function SharedGoalsPage() {
  return (
    <Suspense fallback={<GoalsSkeleton />}>
      <SharedGoals />
    </Suspense>
  );
}

async function SharedGoals() {
  const [overview, { contacts }] = await Promise.all([getSharedOverview("goal"), getContactsOverview()]);
  return <GoalListView {...overview} contacts={contacts} />;
}

function GoalsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    </div>
  );
}
