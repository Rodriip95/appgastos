"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { verifySession } from "@/lib/auth/session";
import { DOC_ID_RE, userCollection } from "@/lib/data/collections";
import { COLOR_KEYS, ICON_KEYS } from "@/lib/finance/catalog";
import { DEFAULT_CATEGORIES } from "@/lib/finance/defaults";
import type { ActionResult } from "@/lib/finance/types";

const categorySchema = z.object({
  type: z.enum(["income", "expense"]),
  name: z.string().trim().min(1, "Ponle un nombre a la categoría").max(40, "Nombre muy largo"),
  description: z.string().trim().max(160, "Descripción muy larga").default(""),
  icon: z.enum(ICON_KEYS),
  color: z.enum(COLOR_KEYS),
  subcategories: z
    .array(
      z.object({
        id: z.string().max(64).default(""),
        name: z.string().trim().min(1).max(40, "Subcategoría muy larga"),
      }),
    )
    .max(30, "Máximo 30 subcategorías"),
});

export type CategoryInput = z.input<typeof categorySchema>;

const idSchema = z.string().regex(DOC_ID_RE);
const fail = (error: string): ActionResult => ({ ok: false, error });

export async function saveCategory(input: CategoryInput, id?: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (id !== undefined && !idSchema.safeParse(id).success) return fail("Categoría inválida");

  const seen = new Set<string>();
  const subcategories = parsed.data.subcategories
    .filter((s) => {
      const k = s.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((s) => ({ id: s.id || randomUUID(), name: s.name }));

  const data = { ...parsed.data, subcategories };
  const col = userCollection(uid, "categories");

  try {
    if (id) {
      const ref = col.doc(id);
      const current = await ref.get();
      if (!current.exists) return fail("La categoría ya no existe");
      // El tipo (ingreso/gasto) no cambia: los movimientos dependen de él.
      await ref.update({ ...data, type: current.get("type"), updatedAt: FieldValue.serverTimestamp() });
    } else {
      await col.add({ ...data, createdAt: FieldValue.serverTimestamp() });
    }
  } catch (error) {
    console.error("[categories] save:", error);
    return fail("No pudimos guardar la categoría");
  }

  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Categoría inválida");

  try {
    // Los movimientos asociados se conservan y pasan a mostrarse como "Sin categoría".
    await userCollection(uid, "categories").doc(id).delete();
  } catch (error) {
    console.error("[categories] delete:", error);
    return fail("No pudimos eliminar la categoría");
  }

  refresh();
  return { ok: true };
}

/** Agrega las categorías sugeridas que el usuario todavía no tenga (por nombre y tipo). */
export async function addDefaultCategories(): Promise<ActionResult & { added?: number }> {
  const { uid } = await verifySession();
  const col = userCollection(uid, "categories");

  try {
    const existing = await col.select("name", "type").get();
    const taken = new Set(
      existing.docs.map((d) => `${d.get("type")}:${String(d.get("name")).toLowerCase()}`),
    );
    const missing = DEFAULT_CATEGORIES.filter((c) => !taken.has(`${c.type}:${c.name.toLowerCase()}`));

    const batch = col.firestore.batch();
    for (const c of missing) {
      batch.set(col.doc(), {
        ...c,
        subcategories: c.subcategories.map((name) => ({ id: randomUUID(), name })),
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    refresh();
    return { ok: true, added: missing.length };
  } catch (error) {
    console.error("[categories] defaults:", error);
    return fail("No pudimos agregar las categorías sugeridas");
  }
}
