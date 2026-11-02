"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { verifySession } from "@/lib/auth/session";
import { extractStatement, STATEMENT_MEDIA_TYPES, StatementReadError } from "@/lib/ai/statement";
import { toCard } from "@/lib/data/cards";
import { getCategories } from "@/lib/data/categories";
import { DOC_ID_RE, userCollection } from "@/lib/data/collections";
import { nextDueDate, remainingInstallments } from "@/lib/finance/cards";
import { todayKey } from "@/lib/finance/format";
import type { ActionResult, Category } from "@/lib/finance/types";

/** Tamaño máximo del archivo (Vercel corta los pedidos de más de 4,5 MB). */
const MAX_BYTES = 4 * 1024 * 1024;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type StatementItem = {
  key: string;
  /** Fecha de la compra original (YYYY-MM-DD) */
  date: string;
  note: string;
  /** Lo que cobra este resumen (la cuota) */
  amount: number;
  currency: "ARS" | "USD";
  installment: number;
  installments: number;
  categoryId: string | null;
  subcategoryId: string | null;
  /** Ya hay un gasto de esta tarjeta con el mismo monto en ese resumen */
  duplicate: boolean;
};

export type StatementPreview = {
  /** Mes del resumen (el de su vencimiento), YYYY-MM */
  month: string;
  cardName: string | null;
  items: StatementItem[];
};

const fail = (error: string) => ({ ok: false as const, error });

const isDate = (v: string | null): v is string => !!v && z.iso.date().safeParse(v).success;

/** Deja solo categorías de gasto del usuario y subcategorías que les pertenecen. */
function sanitizeCategory(categories: Category[], categoryId: string | null, subcategoryId: string | null) {
  const cat = categories.find((c) => c.id === categoryId && c.type === "expense");
  if (!cat) return { categoryId: null, subcategoryId: null };
  return { categoryId: cat.id, subcategoryId: cat.subcategories.some((s) => s.id === subcategoryId) ? subcategoryId : null };
}

/** Lee un resumen (PDF o imagen) con IA y devuelve una vista previa editable. No guarda nada. */
export async function analyzeStatement(
  formData: FormData,
): Promise<{ ok: true; preview: StatementPreview } | { ok: false; error: string }> {
  const { uid } = await verifySession();
  const file = formData.get("file");
  const cardId = String(formData.get("cardId") ?? "");
  if (!DOC_ID_RE.test(cardId)) return fail("Elige una tarjeta");
  if (!(file instanceof File) || file.size === 0) return fail("Elige el archivo del resumen");
  if (file.size > MAX_BYTES) return fail("El archivo pesa más de 4 MB");
  const mediaType = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!(STATEMENT_MEDIA_TYPES as readonly string[]).includes(mediaType)) {
    return fail("Sube un PDF o una imagen (PNG, JPG o WEBP)");
  }
  if (!process.env.ANTHROPIC_API_KEY) return fail("Falta configurar ANTHROPIC_API_KEY en el servidor");

  const cardDoc = await userCollection(uid, "cards").doc(cardId).get();
  if (!cardDoc.exists) return fail("La tarjeta seleccionada no existe");
  const card = toCard(cardDoc);
  const categories = await getCategories();

  let extracted;
  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    extracted = await extractStatement({ data, mediaType }, categories);
  } catch (error) {
    if (error instanceof StatementReadError) return fail(error.message);
    console.error("[card-import] analyze:", error);
    return fail("No pudimos analizar el resumen. Prueba de nuevo en un rato");
  }

  const month = isDate(extracted.dueDate) ? extracted.dueDate.slice(0, 7) : nextDueDate(card, todayKey()).slice(0, 7);
  const fallbackDate = isDate(extracted.closingDate) ? extracted.closingDate : `${month}-01`;

  // Posibles repetidos: gastos de esta tarjeta ya cargados en el mismo resumen.
  const existing = await userCollection(uid, "transactions").where("month", "==", month).get();
  const loaded = existing.docs.filter((d) => d.get("cardId") === cardId).map((d) => Number(d.get("amount")));

  const items: StatementItem[] = extracted.items
    .filter((it) => Number.isFinite(it.amount) && it.amount > 0)
    .map((it) => {
      const amount = Math.round(it.amount * 100) / 100;
      const installments = Math.min(Math.max(Math.trunc(it.installments) || 1, 1), 48);
      const installment = Math.min(Math.max(Math.trunc(it.installment) || 1, 1), installments);
      return {
        key: randomUUID(),
        date: isDate(it.date) ? it.date : fallbackDate,
        note: it.description.trim().slice(0, 120),
        amount,
        currency: it.currency,
        installment,
        installments,
        ...sanitizeCategory(categories, it.categoryId, it.subcategoryId),
        duplicate: loaded.some((a) => Math.abs(a - amount) < 0.01),
      };
    });

  if (items.length === 0) return fail("No encontramos consumos en el archivo");
  return { ok: true, preview: { month, cardName: extracted.cardName, items } };
}

const itemSchema = z
  .object({
    date: z.iso.date("Fecha inválida"),
    note: z.string().trim().max(120, "Descripción muy larga"),
    amount: z.number("Monto inválido").positive("Los montos deben ser mayores a 0").max(1e12, "Monto demasiado grande"),
    installment: z.number().int().min(1, "Cuota inválida"),
    installments: z.number().int().min(1, "Mínimo 1 cuota").max(48, "Máximo 48 cuotas"),
    categoryId: z.string().regex(DOC_ID_RE).nullable(),
    subcategoryId: z.string().max(64).nullable(),
  })
  .refine((it) => it.installment <= it.installments, "La cuota no puede ser mayor que el total de cuotas");

const importSchema = z.object({
  cardId: z.string().regex(DOC_ID_RE, "Elige una tarjeta"),
  month: z.string().regex(MONTH_RE, "Mes del resumen inválido"),
  items: z.array(itemSchema).min(1, "Elige al menos un consumo").max(300, "Demasiados consumos"),
});

export type StatementImportInput = z.input<typeof importSchema>;

/**
 * Guarda los consumos confirmados. Cada uno es una compra con tarjeta: la cuota
 * que cobra este resumen y las que quedan, una por mes. Las cuotas ya pagadas no se cargan.
 */
export async function importStatement(input: StatementImportInput): Promise<ActionResult & { count?: number }> {
  const { uid } = await verifySession();
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { cardId, month, items } = parsed.data;

  try {
    const cardDoc = await userCollection(uid, "cards").doc(cardId).get();
    if (!cardDoc.exists) return fail("La tarjeta seleccionada no existe");
    const card = toCard(cardDoc);
    const categories = await getCategories();

    const col = userCollection(uid, "transactions");
    const docs = items.flatMap((it) => {
      const category = sanitizeCategory(categories, it.categoryId, it.subcategoryId);
      const purchaseId = randomUUID();
      return remainingInstallments(card, month, it.amount, it.installment, it.installments).map((cuota) => ({
        type: "expense",
        amount: cuota.amount,
        date: cuota.date,
        month: cuota.month,
        ...category,
        note: it.note,
        recurring: false,
        cardId,
        purchaseId,
        purchaseDate: it.date,
        installment: { n: cuota.n, total: cuota.total },
        importedFrom: "statement",
        createdAt: FieldValue.serverTimestamp(),
      }));
    });

    // Firestore admite hasta 500 escrituras por batch.
    for (let i = 0; i < docs.length; i += 450) {
      const batch = col.firestore.batch();
      for (const data of docs.slice(i, i + 450)) batch.set(col.doc(), data);
      await batch.commit();
    }
  } catch (error) {
    console.error("[card-import] import:", error);
    return fail("No pudimos guardar los consumos");
  }
  refresh();
  return { ok: true, count: items.length };
}
