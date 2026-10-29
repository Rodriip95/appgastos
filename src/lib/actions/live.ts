"use server";

import { verifySession } from "@/lib/auth/session";
import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * Token para que el navegador escuche SU documento de señales en tiempo real.
 * Las reglas de Firestore solo le dejan leer `liveSignals/{su uid}`.
 */
export async function getRealtimeToken(): Promise<{ token: string; uid: string } | null> {
  const { uid } = await verifySession();
  try {
    return { token: await getAdminAuth().createCustomToken(uid), uid };
  } catch (error) {
    console.error("[live] token:", error);
    return null;
  }
}
