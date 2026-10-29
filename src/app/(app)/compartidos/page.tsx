import { Suspense } from "react";
import type { Metadata } from "next";
import { SharedListView } from "@/components/shared/SharedListView";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories } from "@/lib/data/categories";
import { getContactsOverview } from "@/lib/data/contacts";
import { getSharedOverview } from "@/lib/data/shared";
import { toExpenseCategories } from "@/lib/finance/defaults";

export const metadata: Metadata = { title: "Gastos compartidos · Bingo" };

export default function SharedPage() {
  return (
    <Suspense fallback={<SharedSkeleton />}>
      <Shared />
    </Suspense>
  );
}

async function Shared() {
  const [overview, { contacts }, categories] = await Promise.all([
    getSharedOverview("expenses"),
    getContactsOverview(),
    getCategories(),
  ]);
  return <SharedListView {...overview} contacts={contacts} categories={toExpenseCategories(categories)} />;
}

function SharedSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl" />
      </div>
    </div>
  );
}
