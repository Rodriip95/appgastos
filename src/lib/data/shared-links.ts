import "server-only";
import { cache } from "react";
import { verifySession } from "@/lib/auth/session";
import { sharedCollection, userCollection } from "@/lib/data/collections";
import { toSpace } from "@/lib/data/shared";
import { fromCents } from "@/lib/finance/shared";
import type { GoalMovement, Transaction } from "@/lib/finance/types";

/** Espacios compartidos cuya parte suma al resumen personal (spaceId → categoría elegida). */
export type SharedLinks = Record<string, { categoryId: string | null }>;

export const getSharedLinks = cache(async (): Promise<SharedLinks> => {
  const { uid } = await verifySession();
  const snap = await userCollection(uid, "sharedLinks").get();
  return Object.fromEntries(snap.docs.map((d) => [d.id, { categoryId: d.get("categoryId") ?? null }]));
});

export type SharedMonthSummary = {
  /** Mi parte de cada gasto compartido, como movimientos de solo lectura */
  transactions: Transaction[];
  /** Mis aportes y retiros en objetivos compartidos, como dinero apartado */
  goalMovements: GoalMovement[];
};

/**
 * Lo compartido que corresponde al resumen de un mes: de los gastos, solo la parte
 * que me toca (lo que adelanté por otro no es gasto mío); de los objetivos, lo que yo aporté.
 */
export async function getSharedMonthSummary(month: string): Promise<SharedMonthSummary> {
  const { uid } = await verifySession();
  const links = await getSharedLinks();

  const parts = await Promise.all(
    Object.entries(links).map(async ([spaceId, link]) => {
      const spaceRef = sharedCollection().doc(spaceId);
      const [spaceDoc, entries] = await Promise.all([
        spaceRef.get(),
        spaceRef.collection("entries").where("month", "==", month).get(),
      ]);
      const out: SharedMonthSummary = { transactions: [], goalMovements: [] };
      if (!spaceDoc.exists) return out;
      const space = toSpace(spaceDoc);
      // Si ya no participo, deja de sumar aunque el vínculo siga guardado.
      if (space.members.find((m) => m.uid === uid)?.status !== "accepted") return out;
      const concept = new Map(space.subcategories.map((s) => [s.id, s.name]));

      for (const doc of entries.docs) {
        const type = doc.get("type");
        const createdAt = doc.get("createdAt")?.toMillis?.() ?? 0;
        const date: string = doc.get("date");

        if (space.kind === "expenses" && type === "expense") {
          const mine = Number(doc.get("split")?.[uid]) || 0;
          if (mine <= 0) continue;
          const sub = concept.get(doc.get("subcategoryId") ?? "");
          out.transactions.push({
            id: `shared:${spaceId}:${doc.id}`,
            type: "expense",
            amount: fromCents(mine),
            date,
            month,
            categoryId: link.categoryId,
            subcategoryId: null,
            note: [space.name, sub].filter(Boolean).join(" · "),
            recurring: false,
            cardId: null,
            purchaseId: null,
            installment: null,
            sharedSpaceId: spaceId,
            createdAt,
          });
        } else if (space.kind === "goal" && (type === "deposit" || type === "withdrawal")) {
          if (doc.get("paidBy") !== uid) continue;
          const cents = Number(doc.get("amountCents")) || 0;
          out.goalMovements.push({
            id: `shared:${spaceId}:${doc.id}`,
            goalId: spaceId,
            amount: fromCents(type === "deposit" ? cents : -cents),
            date,
            month,
            note: doc.get("note") ?? "",
            createdAt,
          });
        }
      }
      return out;
    }),
  );

  return {
    transactions: parts.flatMap((p) => p.transactions),
    goalMovements: parts.flatMap((p) => p.goalMovements),
  };
}
