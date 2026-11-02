import "server-only";
import { cache } from "react";
import { verifySession } from "@/lib/auth/session";
import { userCollection } from "@/lib/data/collections";
import { statementKey } from "@/lib/finance/cards";

/**
 * Resúmenes marcados como pagados, como claves `cardId:YYYY-MM` (ver `statementKey`).
 * Son pocos documentos por usuario (uno por tarjeta y mes pagado), así que se leen todos.
 */
export const getPaidStatements = cache(async (): Promise<string[]> => {
  const { uid } = await verifySession();
  const snap = await userCollection(uid, "cardPayments").select("cardId", "month").get();
  return snap.docs.map((d) => statementKey(d.get("cardId") as string, d.get("month") as string));
});
