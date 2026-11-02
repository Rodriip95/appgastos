import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

// Los datos personales viven bajo users/{uid}/... para aislarlos por usuario.
export const userCollection = (
  uid: string,
  name: "categories" | "transactions" | "cards" | "goals" | "goalMovements" | "contacts" | "sharedLinks" | "pushTokens" | "orders" | "orderPayments" | "materials" | "materialPurchases" | "statementImports" | "cardPayments" | "clients" | "businessExpenses" | "settings",
) => getAdminDb().collection("users").doc(uid).collection(name);

/** Perfiles públicos mínimos (users/{uid}): permiten buscar a una persona por email. */
export const profilesCollection = () => getAdminDb().collection("users");

/** Solicitudes de contacto entre dos usuarios (id determinístico `${fromUid}_${toUid}`). */
export const contactRequestsCollection = () => getAdminDb().collection("contactRequests");

/** Señales de tiempo real por usuario (liveSignals/{uid}); solo las escribe el servidor. */
export const liveSignalsCollection = () => getAdminDb().collection("liveSignals");

/** Espacios compartidos (shared/{id}) con sus movimientos en la subcolección `entries`. */
export const sharedCollection = () => getAdminDb().collection("shared");

/** Cupo global de resúmenes leídos con IA por titular y mes (statementQuota/{huella}_{YYYY-MM}). */
export const statementQuotaCollection = () => getAdminDb().collection("statementQuota");

/** IDs de documentos válidos (evita rutas arbitrarias desde el cliente). */
export const DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
