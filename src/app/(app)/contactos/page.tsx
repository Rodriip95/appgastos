import { Suspense } from "react";
import type { Metadata } from "next";
import { ContactsView } from "@/components/contacts/ContactsView";
import { Skeleton } from "@/components/ui/skeleton";
import { getContactsOverview } from "@/lib/data/contacts";

export const metadata: Metadata = { title: "Contactos · Bingo" };

export default function ContactsPage() {
  return (
    <Suspense fallback={<ContactsSkeleton />}>
      <Contacts />
    </Suspense>
  );
}

async function Contacts() {
  return <ContactsView {...await getContactsOverview()} />;
}

function ContactsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-64" />
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}
