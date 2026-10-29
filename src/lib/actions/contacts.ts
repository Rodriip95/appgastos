"use server";

import { refresh } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { verifySession } from "@/lib/auth/session";
import { contactRequestsCollection, DOC_ID_RE, userCollection } from "@/lib/data/collections";
import { findProfileByEmail, toPerson, upsertProfile } from "@/lib/data/profiles";
import type { ActionResult } from "@/lib/finance/types";

const emailSchema = z.email("Ingresa un email válido").max(254);
const idSchema = z.string().regex(DOC_ID_RE);
const fail = (error: string): ActionResult => ({ ok: false, error });
const requestId = (fromUid: string, toUid: string) => `${fromUid}_${toUid}`;

/**
 * Envía una solicitud de contacto por email. La respuesta es la misma exista o no
 * esa persona, para que nadie pueda averiguar quién usa la app.
 */
export async function sendContactRequest(email: string): Promise<ActionResult> {
  const me = await verifySession();
  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Email inválido");
  if (parsed.data.toLowerCase() === me.email?.toLowerCase()) return fail("Ese es tu propio email");

  try {
    await upsertProfile(me);
    const target = await findProfileByEmail(parsed.data);
    if (!target || target.uid === me.uid) return { ok: true };

    const requests = contactRequestsCollection();
    const ref = requests.doc(requestId(me.uid, target.uid));
    const reverseRef = requests.doc(requestId(target.uid, me.uid));
    const myContact = userCollection(me.uid, "contacts").doc(target.uid);

    const error = await ref.firestore.runTransaction(async (tx) => {
      const [existing, reverse, contact, mine] = await Promise.all([
        tx.get(ref),
        tx.get(reverseRef),
        tx.get(myContact),
        tx.get(ref.firestore.collection("users").doc(me.uid)),
      ]);
      if (contact.exists) return "Ya es tu contacto";
      // Una solicitud pendiente o rechazada no se duplica ni se revela.
      if (existing.exists) return null;

      // Si esa persona ya me había invitado, aceptarla directamente.
      if (reverse.exists && reverse.get("status") === "pending") {
        const since = FieldValue.serverTimestamp();
        tx.update(reverseRef, { status: "accepted", respondedAt: since });
        tx.set(myContact, { name: target.name, email: target.email, photo: target.photo, since });
        tx.set(userCollection(target.uid, "contacts").doc(me.uid), {
          name: mine.get("name") ?? "",
          email: mine.get("email") ?? "",
          photo: mine.get("photo") ?? null,
          since,
        });
        return null;
      }

      tx.set(ref, {
        fromUid: me.uid,
        toUid: target.uid,
        status: "pending",
        from: {
          name: mine.get("name") ?? "",
          email: mine.get("email") ?? "",
          photo: mine.get("photo") ?? null,
        },
        to: { name: target.name, email: target.email, photo: target.photo },
        createdAt: FieldValue.serverTimestamp(),
      });
      return null;
    });
    if (error) return fail(error);
  } catch (error) {
    console.error("[contacts] send:", error);
    return fail("No pudimos enviar la solicitud");
  }
  refresh();
  return { ok: true };
}

/** Acepta o rechaza una solicitud recibida. */
export async function respondContactRequest(id: string, accept: boolean): Promise<ActionResult> {
  const me = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Solicitud inválida");

  const ref = contactRequestsCollection().doc(id);
  try {
    const error = await ref.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.get("toUid") !== me.uid || snap.get("status") !== "pending") {
        return "La solicitud ya no está disponible";
      }
      const fromUid: string = snap.get("fromUid");
      if (!accept) {
        tx.update(ref, { status: "rejected", respondedAt: FieldValue.serverTimestamp() });
        return null;
      }
      const since = FieldValue.serverTimestamp();
      const from = toPerson(fromUid, snap.get("from") ?? {});
      const to = toPerson(me.uid, snap.get("to") ?? {});
      tx.update(ref, { status: "accepted", respondedAt: since });
      tx.set(userCollection(me.uid, "contacts").doc(fromUid), {
        name: from.name,
        email: from.email,
        photo: from.photo,
        since,
      });
      tx.set(userCollection(fromUid, "contacts").doc(me.uid), {
        name: to.name,
        email: to.email,
        photo: to.photo,
        since,
      });
      return null;
    });
    if (error) return fail(error);
  } catch (error) {
    console.error("[contacts] respond:", error);
    return fail("No pudimos responder la solicitud");
  }
  refresh();
  return { ok: true };
}

/** Cancela una solicitud que envié y sigue pendiente. */
export async function cancelContactRequest(id: string): Promise<ActionResult> {
  const me = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Solicitud inválida");

  const ref = contactRequestsCollection().doc(id);
  try {
    const snap = await ref.get();
    if (snap.exists && snap.get("fromUid") === me.uid && snap.get("status") === "pending") {
      await ref.delete();
    }
  } catch (error) {
    console.error("[contacts] cancel:", error);
    return fail("No pudimos cancelar la solicitud");
  }
  refresh();
  return { ok: true };
}

/** Elimina el contacto de ambos lados; luego pueden volver a agregarse. */
export async function removeContact(otherUid: string): Promise<ActionResult> {
  const me = await verifySession();
  if (!idSchema.safeParse(otherUid).success) return fail("Contacto inválido");

  try {
    const requests = contactRequestsCollection();
    const batch = requests.firestore.batch();
    batch.delete(userCollection(me.uid, "contacts").doc(otherUid));
    batch.delete(userCollection(otherUid, "contacts").doc(me.uid));
    batch.delete(requests.doc(requestId(me.uid, otherUid)));
    batch.delete(requests.doc(requestId(otherUid, me.uid)));
    await batch.commit();
  } catch (error) {
    console.error("[contacts] remove:", error);
    return fail("No pudimos eliminar el contacto");
  }
  refresh();
  return { ok: true };
}
