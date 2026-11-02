"use server";

import { refresh } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { verifySession } from "@/lib/auth/session";
import { profilesCollection } from "@/lib/data/collections";
import { isUsdReference } from "@/lib/data/fx";
import type { ActionResult } from "@/lib/finance/types";

/** Guarda el dólar de referencia para el equivalente en pesos (oficial, MEP o blue). */
export async function setUsdReference(kind: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!isUsdReference(kind)) return { ok: false, error: "Cotización inválida" };
  try {
    await profilesCollection()
      .doc(uid)
      .set({ usdReference: kind, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("[fx] reference:", error);
    return { ok: false, error: "No pudimos guardar la cotización" };
  }
  refresh();
  return { ok: true };
}
