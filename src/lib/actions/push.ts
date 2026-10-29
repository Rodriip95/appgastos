"use server";

import { z } from "zod";
import { verifySession } from "@/lib/auth/session";
import { userCollection } from "@/lib/data/collections";
import { tokenId } from "@/lib/data/push";
import type { ActionResult } from "@/lib/finance/types";

const tokenSchema = z.string().min(20).max(4096);

/** Guarda el token de este dispositivo para recibir avisos. */
export async function savePushToken(token: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return { ok: false, error: "Token inválido" };
  try {
    await userCollection(uid, "pushTokens")
      .doc(tokenId(parsed.data))
      .set({ token: parsed.data, createdAt: Date.now() });
  } catch (error) {
    console.error("[push] save:", error);
    return { ok: false, error: "No pudimos activar los avisos" };
  }
  return { ok: true };
}

export async function removePushToken(token: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return { ok: true };
  try {
    await userCollection(uid, "pushTokens").doc(tokenId(parsed.data)).delete();
  } catch (error) {
    console.error("[push] remove:", error);
    return { ok: false, error: "No pudimos desactivar los avisos" };
  }
  return { ok: true };
}
