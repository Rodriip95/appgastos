"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRealtimeToken } from "@/lib/actions/live";
import { auth, firebaseApp } from "@/lib/firebase/client";

/** Cambios seguidos (p. ej. varios avisos juntos) se atienden con una sola actualización. */
const DEBOUNCE_MS = 400;

/**
 * Mantiene la pantalla al día cuando otra persona hace algo que nos afecta (acepta una
 * solicitud, carga un gasto…). Escucha UN documento propio con el SDK de Firestore y, ante
 * un cambio, pide al servidor la pantalla de nuevo (`router.refresh`): los datos nunca se
 * leen desde el navegador. Al volver a la app desde segundo plano también se actualiza,
 * porque en el celular la conexión en vivo se corta.
 */
export function LiveSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refreshSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), DEBOUNCE_MS);
    };

    (async () => {
      const session = await getRealtimeToken();
      if (!session || cancelled) return;
      const [{ signInWithCustomToken }, { doc, getFirestore, onSnapshot }] = await Promise.all([
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);
      if (auth.currentUser?.uid !== session.uid) await signInWithCustomToken(auth, session.token);
      if (cancelled) return;

      let first = true;
      unsubscribe = onSnapshot(
        doc(getFirestore(firebaseApp), "liveSignals", session.uid),
        () => {
          // La primera lectura es el estado actual, no un cambio.
          if (first) first = false;
          else refreshSoon();
        },
        () => {
          // Sin permiso o sin conexión: la app sigue funcionando, solo sin tiempo real.
        },
      );
    })().catch((error) => console.error("[live] sync:", error));

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSoon();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe?.();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
