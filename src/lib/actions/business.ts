"use server";

import { refresh } from "next/cache";
import { FieldValue, type Transaction as FirestoreTx } from "firebase-admin/firestore";
import { z } from "zod";
import { verifySession } from "@/lib/auth/session";
import { DOC_ID_RE, userCollection } from "@/lib/data/collections";
import {
  ORDER_PRIORITIES,
  ORDER_STATUSES,
  orderBalance,
  type OrderMaterial,
} from "@/lib/finance/business";
import { formatMoney } from "@/lib/finance/format";
import type { ActionResult } from "@/lib/finance/types";

const money = z.number("Ingresa un monto válido").positive("El monto debe ser mayor a 0").max(1e12);
const quantity = z.number("Ingresa una cantidad válida").positive("La cantidad debe ser mayor a 0").max(1e9);
const idSchema = z.string().regex(DOC_ID_RE);

const orderSchema = z.object({
  client: z.string().trim().min(1, "¿Para quién es el pedido?").max(60, "Nombre muy largo"),
  phone: z.string().trim().max(30, "Teléfono muy largo").default(""),
  detail: z.string().trim().min(1, "Cuenta qué lleva el pedido").max(500, "Detalle muy largo"),
  amount: money,
  priority: z.enum(ORDER_PRIORITIES),
  deliveryDate: z.iso.date("Fecha inválida"),
  materials: z.array(z.object({ materialId: idSchema, qty: quantity })).max(30),
});
export type OrderInput = z.input<typeof orderSchema>;

const paymentSchema = z.object({
  orderId: idSchema,
  amount: money,
  date: z.iso.date("Fecha inválida"),
  note: z.string().trim().max(120, "Descripción muy larga").default(""),
  addToSummary: z.boolean(),
});
export type PaymentInput = z.input<typeof paymentSchema>;

const materialSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre al material").max(60, "Nombre muy largo"),
  unit: z.string().trim().min(1, "Indica la unidad").max(12, "Unidad muy larga"),
  unitPrice: z.number("Ingresa un precio válido").min(0, "Precio inválido").max(1e12),
  stock: z.number("Ingresa un stock válido").min(-1e9).max(1e9),
});
export type MaterialInput = z.input<typeof materialSchema>;

const purchaseSchema = z.object({
  materialId: idSchema,
  qty: quantity,
  total: money,
  date: z.iso.date("Fecha inválida"),
});
export type PurchaseInput = z.input<typeof purchaseSchema>;

const fail = (error: string): ActionResult => ({ ok: false, error });
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Aplica cambios de stock dentro de una transacción (materialId → diferencia).
 * Va después de las lecturas propias y antes de cualquier escritura: lee los materiales.
 * Los que ya no existen se ignoran.
 */
async function adjustStock(tx: FirestoreTx, uid: string, deltas: Map<string, number>) {
  const col = userCollection(uid, "materials");
  const entries = [...deltas].filter(([, delta]) => delta !== 0);
  if (entries.length === 0) return;
  const docs = await tx.getAll(...entries.map(([id]) => col.doc(id)));
  docs.forEach((doc, i) => {
    if (doc.exists) tx.update(doc.ref, { stock: round2((Number(doc.get("stock")) || 0) + entries[i][1]) });
  });
}

function stockDeltas(materials: OrderMaterial[], sign: 1 | -1, base = new Map<string, number>()) {
  for (const m of materials) base.set(m.materialId, (base.get(m.materialId) ?? 0) + sign * m.qty);
  return base;
}

export async function saveOrder(input: OrderInput, id?: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (id !== undefined && !idSchema.safeParse(id).success) return fail("Pedido inválido");
  const { materials, ...fields } = parsed.data;

  const orders = userCollection(uid, "orders");
  const materialsCol = userCollection(uid, "materials");
  try {
    const error = await orders.firestore.runTransaction(async (tx) => {
      const ref = id ? orders.doc(id) : orders.doc();
      const current = id ? await tx.get(ref) : null;
      if (current && !current.exists) return "El pedido ya no existe";
      const previous: OrderMaterial[] = current?.get("materials") ?? [];

      // Precio y nombre se copian al pedido; los que ya estaban conservan su precio.
      const docs = materials.length
        ? await tx.getAll(...materials.map((m) => materialsCol.doc(m.materialId)))
        : [];
      const lines: OrderMaterial[] = [];
      for (const [i, doc] of docs.entries()) {
        const kept = previous.find((p) => p.materialId === materials[i].materialId);
        if (!doc.exists && !kept) return "Uno de los materiales ya no existe";
        lines.push({
          materialId: materials[i].materialId,
          name: doc.exists ? (doc.get("name") as string) : kept!.name,
          qty: materials[i].qty,
          unitPrice: kept?.unitPrice ?? (Number(doc.get("unitPrice")) || 0),
        });
      }

      // Si ya se entregó, el stock sigue la diferencia con lo descontado.
      if (current?.get("status") === "delivered") {
        await adjustStock(tx, uid, stockDeltas(lines, -1, stockDeltas(previous, 1)));
      }
      if (current) {
        tx.update(ref, { ...fields, materials: lines, updatedAt: FieldValue.serverTimestamp() });
      } else {
        tx.set(ref, {
          ...fields,
          materials: lines,
          status: "taken",
          paid: 0,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      return null;
    });
    if (error) return fail(error);
  } catch (error) {
    console.error("[business] save order:", error);
    return fail("No pudimos guardar el pedido");
  }
  refresh();
  return { ok: true };
}

/** Cambia el estado; al entrar o salir de "Entregado" se descuenta o devuelve el stock. */
export async function setOrderStatus(id: string, status: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  const next = z.enum(ORDER_STATUSES).safeParse(status);
  if (!idSchema.safeParse(id).success || !next.success) return fail("Pedido inválido");

  const ref = userCollection(uid, "orders").doc(id);
  try {
    const error = await ref.firestore.runTransaction(async (tx) => {
      const order = await tx.get(ref);
      if (!order.exists) return "El pedido ya no existe";
      const was = order.get("status") === "delivered";
      const is = next.data === "delivered";
      if (was !== is) {
        await adjustStock(tx, uid, stockDeltas(order.get("materials") ?? [], is ? -1 : 1));
      }
      tx.update(ref, { status: next.data });
      return null;
    });
    if (error) return fail(error);
  } catch (error) {
    console.error("[business] status:", error);
    return fail("No pudimos cambiar el estado");
  }
  refresh();
  return { ok: true };
}

/** Elimina el pedido con sus pagos (y los ingresos que sumaron al resumen). El stock no vuelve. */
export async function deleteOrder(id: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Pedido inválido");
  try {
    const orders = userCollection(uid, "orders");
    const transactions = userCollection(uid, "transactions");
    const payments = await userCollection(uid, "orderPayments").where("orderId", "==", id).get();
    const batch = orders.firestore.batch();
    for (const p of payments.docs) {
      batch.delete(p.ref);
      if (p.get("transactionId")) batch.delete(transactions.doc(p.get("transactionId")));
    }
    batch.delete(orders.doc(id));
    await batch.commit();
  } catch (error) {
    console.error("[business] delete order:", error);
    return fail("No pudimos eliminar el pedido");
  }
  refresh();
  return { ok: true };
}

/** Registra una seña o pago; `paid` se actualiza en la misma transacción. */
export async function addOrderPayment(input: PaymentInput): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { orderId, amount, date, note, addToSummary } = parsed.data;
  const month = date.slice(0, 7);

  const orderRef = userCollection(uid, "orders").doc(orderId);
  const paymentRef = userCollection(uid, "orderPayments").doc();
  const txRef = userCollection(uid, "transactions").doc();
  try {
    const error = await orderRef.firestore.runTransaction(async (tx) => {
      const order = await tx.get(orderRef);
      if (!order.exists) return "El pedido ya no existe";
      const paid = Number(order.get("paid")) || 0;
      const balance = orderBalance({ amount: Number(order.get("amount")) || 0, paid });
      if (amount > balance + 0.001) return `El saldo de este pedido es ${formatMoney(balance)}`;
      const client: string = order.get("client");
      tx.set(paymentRef, {
        orderId,
        client,
        amount,
        date,
        month,
        note,
        transactionId: addToSummary ? txRef.id : null,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(orderRef, { paid: round2(paid + amount) });
      if (addToSummary) {
        tx.set(txRef, {
          type: "income",
          amount,
          date,
          month,
          categoryId: null,
          subcategoryId: null,
          note: `Pedido de ${client}`,
          recurring: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      return null;
    });
    if (error) return fail(error);
  } catch (error) {
    console.error("[business] payment:", error);
    return fail("No pudimos registrar el pago");
  }
  refresh();
  return { ok: true };
}

/** Deshace un pago y el ingreso que haya sumado al resumen. */
export async function deleteOrderPayment(id: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Pago inválido");
  const paymentRef = userCollection(uid, "orderPayments").doc(id);
  try {
    await paymentRef.firestore.runTransaction(async (tx) => {
      const payment = await tx.get(paymentRef);
      if (!payment.exists) return;
      const orderRef = userCollection(uid, "orders").doc(payment.get("orderId"));
      const order = await tx.get(orderRef);
      if (order.exists) {
        const paid = Number(order.get("paid")) || 0;
        tx.update(orderRef, { paid: round2(Math.max(0, paid - Number(payment.get("amount")))) });
      }
      if (payment.get("transactionId")) {
        tx.delete(userCollection(uid, "transactions").doc(payment.get("transactionId")));
      }
      tx.delete(paymentRef);
    });
  } catch (error) {
    console.error("[business] delete payment:", error);
    return fail("No pudimos eliminar el pago");
  }
  refresh();
  return { ok: true };
}

export async function saveMaterial(input: MaterialInput, id?: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (id !== undefined && !idSchema.safeParse(id).success) return fail("Material inválido");

  const col = userCollection(uid, "materials");
  try {
    if (id) {
      const ref = col.doc(id);
      if (!(await ref.get()).exists) return fail("El material ya no existe");
      await ref.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });
    } else {
      await col.add({ ...parsed.data, createdAt: FieldValue.serverTimestamp() });
    }
  } catch (error) {
    console.error("[business] save material:", error);
    return fail("No pudimos guardar el material");
  }
  refresh();
  return { ok: true };
}

/** Los pedidos y compras conservan su copia del nombre y el precio. */
export async function deleteMaterial(id: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Material inválido");
  try {
    await userCollection(uid, "materials").doc(id).delete();
  } catch (error) {
    console.error("[business] delete material:", error);
    return fail("No pudimos eliminar el material");
  }
  refresh();
  return { ok: true };
}

/** Compra de material: suma al stock, actualiza el precio y cuenta como gasto del negocio. */
export async function addMaterialPurchase(input: PurchaseInput): Promise<ActionResult> {
  const { uid } = await verifySession();
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { materialId, qty, total, date } = parsed.data;

  const materialRef = userCollection(uid, "materials").doc(materialId);
  const purchaseRef = userCollection(uid, "materialPurchases").doc();
  try {
    const error = await materialRef.firestore.runTransaction(async (tx) => {
      const material = await tx.get(materialRef);
      if (!material.exists) return "El material ya no existe";
      tx.set(purchaseRef, {
        materialId,
        name: material.get("name"),
        qty,
        total,
        date,
        month: date.slice(0, 7),
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(materialRef, {
        stock: round2((Number(material.get("stock")) || 0) + qty),
        unitPrice: round2(total / qty),
      });
      return null;
    });
    if (error) return fail(error);
  } catch (error) {
    console.error("[business] purchase:", error);
    return fail("No pudimos registrar la compra");
  }
  refresh();
  return { ok: true };
}

/** Deshace una compra: resta del stock; el precio queda como está. */
export async function deleteMaterialPurchase(id: string): Promise<ActionResult> {
  const { uid } = await verifySession();
  if (!idSchema.safeParse(id).success) return fail("Compra inválida");
  const purchaseRef = userCollection(uid, "materialPurchases").doc(id);
  try {
    await purchaseRef.firestore.runTransaction(async (tx) => {
      const purchase = await tx.get(purchaseRef);
      if (!purchase.exists) return;
      await adjustStock(tx, uid, new Map([[purchase.get("materialId"), -Number(purchase.get("qty"))]]));
      tx.delete(purchaseRef);
    });
  } catch (error) {
    console.error("[business] delete purchase:", error);
    return fail("No pudimos eliminar la compra");
  }
  refresh();
  return { ok: true };
}
