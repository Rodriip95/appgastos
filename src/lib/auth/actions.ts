"use server";

import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/session";

/** Intercambia el ID token de Firebase (cliente) por una cookie de sesión httpOnly. */
export async function createSession(idToken: string): Promise<{ ok: boolean }> {
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);

    // Solo aceptar tokens de un inicio de sesión reciente
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) return { ok: false };

    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    (await cookies()).set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return { ok: true };
  } catch (error) {
    console.error("[auth] createSession falló:", error);
    return { ok: false };
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
