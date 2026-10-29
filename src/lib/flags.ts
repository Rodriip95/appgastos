import "server-only";
import { cache } from "react";
import type { ServerTemplate } from "firebase-admin/remote-config";
import { getSessionUser } from "@/lib/auth/session";
import { getAdminRemoteConfig } from "@/lib/firebase/admin";

// Feature flags con Remote Config (plantilla de servidor). Se evalúan siempre en el
// servidor: lo que protege una función riesgosa no puede depender del navegador.

export type Flags = {
  /** Módulo "Eliminar información": borra todos los datos de la cuenta */
  dataReset: boolean;
};

/** Parámetros de Remote Config (Firebase Console > Remote Config > Servidor). */
const KEYS = { dataReset: "enable_data_reset" } as const;

const DEFAULTS: Flags = { dataReset: false };

/** La plantilla se vuelve a pedir como mucho una vez por minuto por instancia. */
const TTL_MS = 60_000;
let template: ServerTemplate | null = null;
let loadedAt = 0;
let loading: Promise<ServerTemplate | null> | null = null;

async function loadTemplate(): Promise<ServerTemplate | null> {
  try {
    const next =
      template ??
      (await getAdminRemoteConfig().getServerTemplate({
        defaultConfig: { [KEYS.dataReset]: false },
      }));
    await next.load();
    template = next;
    loadedAt = Date.now();
    return next;
  } catch (error) {
    // Sin Remote Config (API sin habilitar, sin plantilla, sin red) todo queda apagado.
    console.error("[flags] remote config:", error);
    loadedAt = Date.now();
    return template;
  }
}

async function getTemplate(): Promise<ServerTemplate | null> {
  if (template && Date.now() - loadedAt < TTL_MS) return template;
  // Varias requests simultáneas comparten una sola carga.
  loading ??= loadTemplate().finally(() => {
    loading = null;
  });
  return loading;
}

/**
 * Flags de un usuario. `uid` y `email` se pasan como señales para poder apuntar un
 * flag a personas concretas desde la consola (condiciones con señales personalizadas).
 */
export async function getFlagsFor(user: { uid: string; email: string | null }): Promise<Flags> {
  const tpl = await getTemplate();
  if (!tpl) return DEFAULTS;
  try {
    const config = tpl.evaluate({ randomizationId: user.uid, uid: user.uid, email: user.email ?? "" });
    return { dataReset: config.getBoolean(KEYS.dataReset) };
  } catch (error) {
    console.error("[flags] evaluate:", error);
    return DEFAULTS;
  }
}

/** Flags de quien tiene la sesión abierta (todo apagado si no hay sesión). Memoizada por request. */
export const getFlags = cache(async (): Promise<Flags> => {
  const user = await getSessionUser();
  return user ? getFlagsFor(user) : DEFAULTS;
});
