import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

// Todos los datos viven bajo users/{uid}/... para aislarlos por usuario.
export const userCollection = (uid: string, name: "categories" | "transactions" | "cards") =>
  getAdminDb().collection("users").doc(uid).collection(name);

/** IDs de documentos válidos (evita rutas arbitrarias desde el cliente). */
export const DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
