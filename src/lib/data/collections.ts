import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

// Los datos personales viven bajo users/{uid}/... para aislarlos por usuario.
export const userCollection = (
  uid: string,
  name: "categories" | "transactions" | "cards" | "goals" | "goalMovements" | "contacts",
) => getAdminDb().collection("users").doc(uid).collection(name);

/** Perfiles públicos mínimos (users/{uid}): permiten buscar a una persona por email. */
export const profilesCollection = () => getAdminDb().collection("users");

/** Solicitudes de contacto entre dos usuarios (id determinístico `${fromUid}_${toUid}`). */
export const contactRequestsCollection = () => getAdminDb().collection("contactRequests");

/** IDs de documentos válidos (evita rutas arbitrarias desde el cliente). */
export const DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
