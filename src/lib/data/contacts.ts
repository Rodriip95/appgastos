import "server-only";
import { cache } from "react";
import type { DocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { verifySession } from "@/lib/auth/session";
import { contactRequestsCollection, userCollection } from "@/lib/data/collections";
import { toPerson, upsertProfile } from "@/lib/data/profiles";
import type { Contact, ContactRequest } from "@/lib/finance/types";

const millis = (t: unknown) => (t as Timestamp | undefined)?.toMillis() ?? 0;

function toRequest(doc: DocumentSnapshot): ContactRequest {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    from: toPerson(d.fromUid, d.from ?? {}),
    to: toPerson(d.toUid, d.to ?? {}),
    createdAt: millis(d.createdAt),
  };
}

export type ContactsOverview = {
  contacts: Contact[];
  incoming: ContactRequest[];
  outgoing: ContactRequest[];
};

export const getContactsOverview = cache(async (): Promise<ContactsOverview> => {
  const user = await verifySession();
  // Quien ya tenía sesión antes de esta función no tiene perfil: se crea al entrar.
  await upsertProfile(user);

  const requests = contactRequestsCollection();
  const [contactsSnap, incomingSnap, outgoingSnap] = await Promise.all([
    userCollection(user.uid, "contacts").get(),
    requests.where("toUid", "==", user.uid).where("status", "==", "pending").get(),
    requests.where("fromUid", "==", user.uid).where("status", "==", "pending").get(),
  ]);

  const byRecent = (a: ContactRequest, b: ContactRequest) => b.createdAt - a.createdAt;
  return {
    contacts: contactsSnap.docs
      .map((doc) => ({ ...toPerson(doc.id, doc.data()), since: millis(doc.get("since")) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    incoming: incomingSnap.docs.map(toRequest).sort(byRecent),
    outgoing: outgoingSnap.docs.map(toRequest).sort(byRecent),
  };
});

/** Cantidad de solicitudes recibidas pendientes (globito del menú). */
export const getPendingRequestCount = cache(async (): Promise<number> => {
  const { uid } = await verifySession();
  const snap = await contactRequestsCollection()
    .where("toUid", "==", uid)
    .where("status", "==", "pending")
    .count()
    .get();
  return snap.data().count;
});
