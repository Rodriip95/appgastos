import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { after } from "next/server";
import { liveSignalsCollection } from "@/lib/data/collections";

/**
 * Tiempo real sin abrir las lecturas de datos al navegador: cada usuario tiene un
 * documento `liveSignals/{uid}` que solo el servidor escribe. El cliente (LiveSync)
 * escucha el suyo y, cuando cambia, vuelve a pedir la pantalla al servidor.
 * Los datos siguen leyéndose únicamente desde el servidor.
 */
export async function touchLiveNow(uids: string[]): Promise<void> {
  await Promise.all(
    [...new Set(uids)].map((uid) =>
      liveSignalsCollection()
        .doc(uid)
        .set({ at: FieldValue.serverTimestamp(), n: FieldValue.increment(1) }, { merge: true })
        .catch((error) => console.error("[live] touch:", error)),
    ),
  );
}

/** Avisa a otros usuarios que algo cambió para ellos, sin demorar la respuesta. */
export function touch(uids: string[]): void {
  if (uids.length > 0) after(() => touchLiveNow(uids));
}
