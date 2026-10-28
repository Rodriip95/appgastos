import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { io } from "next/cache";
import { getAdminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 días

export type SessionUser = {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

/**
 * Verifica la cookie de sesión contra Firebase. Devuelve null si no hay
 * sesión válida. Memoizada por request con `cache`.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  // firebase-admin usa Date.now() al verificar; esperar al request real evita
  // que Next lo evalúe durante el prerender.
  await io();

  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? null,
      picture: decoded.picture ?? null,
    };
  } catch {
    return null;
  }
});

/** Para páginas/acciones protegidas: redirige a /login si no hay sesión. */
export async function verifySession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
