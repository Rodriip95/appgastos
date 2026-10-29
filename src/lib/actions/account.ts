"use server";

import { refresh } from "next/cache";
import { verifySession } from "@/lib/auth/session";
import { sharedCollection, userCollection, contactRequestsCollection } from "@/lib/data/collections";
import { touch } from "@/lib/data/live";
import { toSpace } from "@/lib/data/shared";
import { exitSpace } from "@/lib/data/shared-write";
import type { ActionResult } from "@/lib/finance/types";
import { getFlags } from "@/lib/flags";

const RESET_PHRASE = "ELIMINAR";

const PERSONAL = [
  "transactions",
  "categories",
  "cards",
  "goals",
  "goalMovements",
  "contacts",
  "sharedLinks",
  "pushTokens",
] as const;

/**
 * Borra TODA la información de la cuenta para empezar de cero: movimientos, categorías,
 * tarjetas, metas, contactos y vínculos. De los espacios compartidos se sale (lo que cargaste
 * queda para las demás personas, o se borra el espacio si no queda nadie). La cuenta de
 * Google y el perfil se conservan. Solo funciona con el flag `enable_data_reset` de
 * Remote Config encendido, y se comprueba aquí en el servidor.
 */
export async function deleteAllMyData(confirmation: string): Promise<ActionResult> {
  const me = await verifySession();
  if (!(await getFlags()).dataReset) return { ok: false, error: "Esta función no está habilitada" };
  if (confirmation.trim() !== RESET_PHRASE) return { ok: false, error: `Escribe ${RESET_PHRASE} para confirmar` };

  const affected = new Set<string>();
  try {
    // Contactos: también se borra la copia que tienen las otras personas.
    const contacts = await userCollection(me.uid, "contacts").get();
    await Promise.all(
      contacts.docs.map((c) => {
        affected.add(c.id);
        return userCollection(c.id, "contacts").doc(me.uid).delete();
      }),
    );

    // Solicitudes enviadas o recibidas (de cualquier estado).
    const requests = contactRequestsCollection();
    const [sent, received] = await Promise.all([
      requests.where("fromUid", "==", me.uid).get(),
      requests.where("toUid", "==", me.uid).get(),
    ]);
    await Promise.all(
      [...sent.docs, ...received.docs].map((r) => {
        affected.add(r.get("fromUid") === me.uid ? r.get("toUid") : r.get("fromUid"));
        return r.ref.delete();
      }),
    );

    // Espacios compartidos: se sale de todos.
    const spaces = await sharedCollection().where("memberIds", "array-contains", me.uid).get();
    for (const doc of spaces.docs) {
      (await exitSpace(doc.ref, toSpace(doc), me.uid)).forEach((uid) => affected.add(uid));
    }

    // Datos personales.
    const db = userCollection(me.uid, "contacts").firestore;
    for (const name of PERSONAL) await db.recursiveDelete(userCollection(me.uid, name));
  } catch (error) {
    console.error("[account] reset:", error);
    return { ok: false, error: "No pudimos borrar todo. Vuelve a intentarlo" };
  }

  affected.delete(me.uid);
  touch([...affected]);
  refresh();
  return { ok: true };
}
