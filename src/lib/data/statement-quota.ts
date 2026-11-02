import "server-only";
import { createHash, createHmac } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { verifySession } from "@/lib/auth/session";
import { statementQuotaCollection, userCollection } from "@/lib/data/collections";
import type { ExtractedStatement } from "@/lib/ai/statement";
import { todayKey } from "@/lib/finance/format";

// Cupo de resúmenes leídos con IA. Cuenta dos cosas por mes calendario:
// - por cuenta: users/{uid}/statementImports (un doc por archivo analizado);
// - por titular: statementQuota/{huella}_{mes}, compartido entre todas las cuentas, para que
//   abrir varias cuentas no multiplique el cupo. La huella es un HMAC del CUIL/DNI del
//   titular (o nombre + últimos 4 dígitos) leído del propio resumen: nunca se guarda el dato.
// Volver a subir el mismo archivo reutiliza el resultado guardado: no cuenta ni llama a la IA.

export const STATEMENTS_PER_MONTH = 2;

export class QuotaError extends Error {}

export const quotaMonth = () => todayKey().slice(0, 7);

export const fileHash = (data: Buffer) => createHash("sha256").update(data).digest("hex");

/** Contenido del resumen que se guarda para reutilizar (sin datos del titular). */
export type CachedStatement = Omit<ExtractedStatement, "holderName" | "holderId" | "cardLast4">;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

function hashSecret(): string {
  // Secreto propio si existe; si no, la clave privada de Firebase (ya es secreta y estable).
  const secret = process.env.STATEMENT_HASH_SECRET || process.env.FIREBASE_PRIVATE_KEY;
  if (!secret) throw new Error("Falta STATEMENT_HASH_SECRET");
  return secret;
}

/** Huella del titular, irreversible. Si el resumen no lo identifica, se usa el resumen en sí. */
export function holderFingerprint(s: ExtractedStatement): string {
  const id = s.holderId?.replace(/\D/g, "") ?? "";
  const last4 = s.cardLast4?.replace(/\D/g, "").slice(-4) ?? "";
  const name = s.holderName ? normalize(s.holderName) : "";
  const key =
    id.length >= 7
      ? `id:${id.length === 11 ? id.slice(2, 10) : id}` // del CUIL/CUIT nos quedamos con el DNI
      : name && last4.length === 4
        ? `nl:${name}|${last4}`
        : `st:${normalize(s.cardName ?? "")}|${s.closingDate ?? ""}|${s.dueDate ?? ""}`;
  return createHmac("sha256", hashSecret()).update(key).digest("hex").slice(0, 40);
}

async function usedThisMonth(uid: string, month: string): Promise<number> {
  const snap = await userCollection(uid, "statementImports").where("quotaMonth", "==", month).count().get();
  return snap.data().count;
}

/** Resúmenes que le quedan al usuario este mes. */
export async function getStatementQuota(): Promise<{ remaining: number; limit: number }> {
  const { uid } = await verifySession();
  const used = await usedThisMonth(uid, quotaMonth());
  return { remaining: Math.max(STATEMENTS_PER_MONTH - used, 0), limit: STATEMENTS_PER_MONTH };
}

export async function checkAccountQuota(uid: string): Promise<number> {
  const used = await usedThisMonth(uid, quotaMonth());
  if (used >= STATEMENTS_PER_MONTH) {
    throw new QuotaError(`Ya usaste los ${STATEMENTS_PER_MONTH} resúmenes de este mes. Se renuevan el 1° del mes que viene`);
  }
  return STATEMENTS_PER_MONTH - used;
}

/** Resultado guardado si este usuario ya analizó el mismo archivo. */
export async function getCachedStatement(uid: string, hash: string): Promise<CachedStatement | null> {
  const doc = await userCollection(uid, "statementImports").doc(hash).get();
  const extracted = doc.get("extracted");
  return extracted ? (extracted as CachedStatement) : null;
}

/**
 * Descuenta un resumen del cupo de la cuenta y del titular, y guarda el resultado.
 * Todo en una transacción para que dos pedidos simultáneos no pasen el límite.
 */
export async function consumeQuota(uid: string, hash: string, extracted: ExtractedStatement): Promise<void> {
  const month = quotaMonth();
  const fingerprint = holderFingerprint(extracted);
  const imports = userCollection(uid, "statementImports");
  const holderRef = statementQuotaCollection().doc(`${fingerprint}_${month}`);
  const content: CachedStatement = {
    dueDate: extracted.dueDate,
    closingDate: extracted.closingDate,
    cardName: extracted.cardName,
    items: extracted.items,
  };

  await imports.firestore.runTransaction(async (tx) => {
    const [mine, holder] = await Promise.all([
      tx.get(imports.where("quotaMonth", "==", month)),
      tx.get(holderRef),
    ]);
    if (mine.size >= STATEMENTS_PER_MONTH) {
      throw new QuotaError(`Ya usaste los ${STATEMENTS_PER_MONTH} resúmenes de este mes`);
    }
    if ((holder.get("count") ?? 0) >= STATEMENTS_PER_MONTH) {
      throw new QuotaError(
        `El titular de este resumen ya cargó ${STATEMENTS_PER_MONTH} resúmenes este mes, desde esta u otra cuenta`,
      );
    }
    tx.set(
      holderRef,
      { month, count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    tx.set(imports.doc(hash), {
      quotaMonth: month,
      fingerprint,
      extracted: content,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

/** Al borrar los datos de la cuenta: se olvida el contenido de los resúmenes pero no el cupo usado. */
export async function forgetStatementContents(uid: string): Promise<void> {
  const snap = await userCollection(uid, "statementImports").get();
  const batch = snap.query.firestore.batch();
  for (const doc of snap.docs) batch.update(doc.ref, { extracted: FieldValue.delete() });
  await batch.commit();
}
