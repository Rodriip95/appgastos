import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { SharedSpaceView } from "@/components/shared/SharedSpaceView";
import { Skeleton } from "@/components/ui/skeleton";
import { getContactsOverview } from "@/lib/data/contacts";
import { getSharedDetail } from "@/lib/data/shared";
import { todayKey } from "@/lib/finance/format";

export const metadata: Metadata = { title: "Gasto compartido · Bingo" };

export default function SharedSpacePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<SpaceSkeleton />}>
      <SharedSpace params={params} />
    </Suspense>
  );
}

async function SharedSpace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, { contacts }] = await Promise.all([getSharedDetail(id, "expenses"), getContactsOverview()]);
  if (!detail) notFound();
  await io(); // "hoy" se calcula en cada request
  return <SharedSpaceView {...detail} contacts={contacts} today={todayKey()} />;
}

function SpaceSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-16 w-72" />
      <Skeleton className="h-72 rounded-3xl" />
      <Skeleton className="h-48 rounded-3xl" />
    </div>
  );
}
