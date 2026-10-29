import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { profilesCollection } from "@/lib/data/collections";
import type { Person } from "@/lib/finance/types";

type ProfileSource = { uid: string; email?: string | null; name?: string | null; picture?: string | null };

/** Crea o actualiza el perfil público; `emailLower` es lo que se busca al agregar contactos. */
export async function upsertProfile(user: ProfileSource): Promise<void> {
  if (!user.email) return;
  await profilesCollection()
    .doc(user.uid)
    .set(
      {
        email: user.email,
        emailLower: user.email.trim().toLowerCase(),
        name: user.name ?? user.email.split("@")[0],
        photo: user.picture ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

/** Busca un perfil por email exacto (nunca hay listados ni búsquedas parciales). */
export async function findProfileByEmail(email: string): Promise<Person | null> {
  const snap = await profilesCollection()
    .where("emailLower", "==", email.trim().toLowerCase())
    .limit(1)
    .get();
  const doc = snap.docs[0];
  return doc ? toPerson(doc.id, doc.data()) : null;
}

export function toPerson(uid: string, d: FirebaseFirestore.DocumentData): Person {
  return {
    uid,
    name: d.name ?? "",
    email: d.email ?? "",
    photo: d.photo ?? null,
  };
}
