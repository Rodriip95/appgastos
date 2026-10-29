import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import type { SharedSpace } from "@/lib/finance/types";

/** Participantes que siguen viendo el espacio (activos o con invitación pendiente), sin `uid`. */
export const othersIn = (space: SharedSpace, uid: string) =>
  space.members.filter((m) => m.uid !== uid && (m.status === "accepted" || m.status === "pending"));

/**
 * Saca a `uid` de un espacio. El historial se conserva marcándolo como ex-integrante;
 * si no queda nadie activo, el espacio se borra completo; si se iba quien lo creó,
 * la propiedad pasa a otra persona activa. Devuelve a quiénes les cambió la vista.
 */
export async function exitSpace(
  ref: FirebaseFirestore.DocumentReference,
  space: SharedSpace,
  uid: string,
): Promise<string[]> {
  const others = othersIn(space, uid);
  const activeOthers = others.filter((m) => m.status === "accepted");

  if (activeOthers.length === 0) {
    await ref.firestore.recursiveDelete(ref);
    return others.map((m) => m.uid);
  }

  const me = space.members.find((m) => m.uid === uid);
  await ref.update({
    memberIds: FieldValue.arrayRemove(uid),
    // Una invitación pendiente se descarta; quien ya participó queda como ex-integrante.
    [`members.${uid}`]: me?.status === "pending" ? FieldValue.delete() : { ...me, status: "left" },
    ...(space.createdBy === uid && { createdBy: activeOthers[0].uid }),
  });
  return others.map((m) => m.uid);
}
