import "server-only";
import { cache } from "react";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { verifySession } from "@/lib/auth/session";
import { userCollection } from "@/lib/data/collections";
import type { Category } from "@/lib/finance/types";

export function toCategory(doc: DocumentSnapshot): Category {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    type: d.type === "income" ? "income" : "expense",
    name: d.name ?? "",
    description: d.description ?? "",
    icon: d.icon ?? "tag",
    color: d.color ?? "slate",
    subcategories: Array.isArray(d.subcategories) ? d.subcategories : [],
    budget: typeof d.budget === "number" && d.budget > 0 ? d.budget : null,
  };
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const { uid } = await verifySession();
  const snap = await userCollection(uid, "categories").orderBy("name").get();
  return snap.docs.map(toCategory);
});
