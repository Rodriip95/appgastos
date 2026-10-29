import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResetDataView } from "@/components/account/ResetDataView";
import { Skeleton } from "@/components/ui/skeleton";
import { verifySession } from "@/lib/auth/session";
import { getFlags } from "@/lib/flags";

export const metadata: Metadata = { title: "Eliminar información · Bingo" };

export default function ResetDataPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <ResetData />
    </Suspense>
  );
}

async function ResetData() {
  await verifySession();
  // Apagado en Remote Config = la página no existe.
  if (!(await getFlags()).dataReset) notFound();
  return <ResetDataView />;
}
