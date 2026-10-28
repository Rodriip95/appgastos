import "server-only";
import { cache } from "react";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { verifySession } from "@/lib/auth/session";
import { userCollection } from "@/lib/data/collections";
import type { CreditCard } from "@/lib/finance/types";

export function toCard(doc: DocumentSnapshot): CreditCard {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    name: d.name ?? "",
    closingDay: Number(d.closingDay) || 1,
    dueDay: Number(d.dueDay) || 1,
    color: d.color ?? "slate",
  };
}

export const getCards = cache(async (): Promise<CreditCard[]> => {
  const { uid } = await verifySession();
  const snap = await userCollection(uid, "cards").orderBy("name").get();
  return snap.docs.map(toCard);
});
