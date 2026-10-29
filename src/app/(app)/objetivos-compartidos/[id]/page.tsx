import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { GoalSpaceView } from "@/components/shared/GoalSpaceView";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories } from "@/lib/data/categories";
import { getContactsOverview } from "@/lib/data/contacts";
import { getSharedDetail } from "@/lib/data/shared";
import { getSharedLinks } from "@/lib/data/shared-links";
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
  const [detail, { contacts }, links, categories] = await Promise.all([
    getSharedDetail(id, "goal"),
    getContactsOverview(),
    getSharedLinks(),
    getCategories(),
  ]);
  if (!detail) notFound();
  await io(); // "hoy" se calcula en cada request
  return (
    <GoalSpaceView
      {...detail}
      contacts={contacts}
      today={todayKey()}
      link={links[id] ?? null}
      expenseCategories={categories.filter((c) => c.type === "expense").map((c) => ({ id: c.id, name: c.name }))}
    />
  );
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
