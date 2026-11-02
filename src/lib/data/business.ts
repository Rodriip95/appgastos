import "server-only";
import { FieldValue, type QueryDocumentSnapshot, type Timestamp } from "firebase-admin/firestore";
import { verifySession } from "@/lib/auth/session";
import { userCollection } from "@/lib/data/collections";
import {
  businessHomeTransactions,
  DEFAULT_SETTINGS,
  EXPENSE_CONCEPTS,
  isLowStock,
  normalizeName,
  type BusinessExpense,
  type BusinessSettings,
  type Client,
  type DateRange,
  type ExpenseConcept,
  type Material,
  type MaterialPurchase,
  type Order,
  type OrderPayment,
  type OrderPriority,
  type OrderStatus,
} from "@/lib/finance/business";
import type { Transaction } from "@/lib/finance/types";
import { shiftDay } from "@/lib/finance/format";

const millis = (doc: QueryDocumentSnapshot) =>
  (doc.get("createdAt") as Timestamp | undefined)?.toMillis() ?? 0;

export function toOrder(doc: QueryDocumentSnapshot): Order {
  const d = doc.data();
  return {
    id: doc.id,
    clientId: d.clientId ?? null,
    client: d.client ?? "",
    phone: d.phone ?? "",
    detail: d.detail ?? "",
    amount: Number(d.amount) || 0,
    priority: (d.priority as OrderPriority) ?? "medium",
    deliveryDate: d.deliveryDate,
    status: (d.status as OrderStatus) ?? "taken",
    materials: d.materials ?? [],
    paid: Number(d.paid) || 0,
    createdAt: millis(doc),
  };
}

function toMaterial(doc: QueryDocumentSnapshot): Material {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.name ?? "",
    unit: d.unit ?? "un",
    unitPrice: Number(d.unitPrice) || 0,
    stock: Number(d.stock) || 0,
    minStock: Number(d.minStock) || 0,
  };
}

function toPayment(doc: QueryDocumentSnapshot): OrderPayment {
  const d = doc.data();
  return {
    id: doc.id,
    orderId: d.orderId,
    client: d.client ?? "",
    amount: Number(d.amount) || 0,
    date: d.date,
    month: d.month,
    note: d.note ?? "",
    transactionId: d.transactionId ?? null,
    createdAt: millis(doc),
  };
}

function toPurchase(doc: QueryDocumentSnapshot): MaterialPurchase {
  const d = doc.data();
  return {
    id: doc.id,
    materialId: d.materialId,
    name: d.name ?? "",
    qty: Number(d.qty) || 0,
    total: Number(d.total) || 0,
    date: d.date,
    month: d.month,
    supplier: d.supplier ?? "",
    createdAt: millis(doc),
  };
}

function toExpense(doc: QueryDocumentSnapshot): BusinessExpense {
  const d = doc.data();
  return {
    id: doc.id,
    concept: EXPENSE_CONCEPTS.includes(d.concept) ? (d.concept as ExpenseConcept) : "other",
    amount: Number(d.amount) || 0,
    date: d.date,
    month: d.month,
    supplier: d.supplier ?? "",
    note: d.note ?? "",
    createdAt: millis(doc),
  };
}

function toClient(doc: QueryDocumentSnapshot): Client {
  const d = doc.data();
  return { id: doc.id, name: d.name ?? "", phone: d.phone ?? "", note: d.note ?? "" };
}

/**
 * Pedidos sin cliente enlazado (de antes de la libreta de clientes): se agrupan por nombre,
 * se crea el cliente que falte y se enlazan. Corre una sola vez por pedido.
 */
async function linkOrphanOrders(uid: string, orders: Order[], clients: Client[]) {
  const orphans = orders.filter((o) => !o.clientId && o.client.trim());
  if (orphans.length === 0) return;
  const clientsCol = userCollection(uid, "clients");
  const ordersCol = userCollection(uid, "orders");
  const byName = new Map(clients.map((c) => [normalizeName(c.name), c]));
  const batch = clientsCol.firestore.batch();
  for (const o of orphans) {
    const key = normalizeName(o.client);
    let client = byName.get(key);
    if (!client) {
      const ref = clientsCol.doc();
      client = { id: ref.id, name: o.client.trim(), phone: o.phone, note: "" };
      batch.set(ref, { name: client.name, phone: client.phone, note: "", createdAt: FieldValue.serverTimestamp() });
      byName.set(key, client);
      clients.push(client);
    } else if (!client.phone && o.phone) {
      client.phone = o.phone;
      batch.update(clientsCol.doc(client.id), { phone: o.phone });
    }
    batch.update(ordersCol.doc(o.id), { clientId: client.id });
    o.clientId = client.id;
  }
  try {
    await batch.commit();
  } catch (error) {
    // Si falla, se ve igual (enlazado en memoria) y se reintenta en la próxima visita.
    console.error("[business] link clients:", error);
  }
  clients.sort((a, b) => a.name.localeCompare(b.name));
}

/** Todo lo del módulo Mi negocio (`/negocio`). */
export async function getBusinessData() {
  const { uid } = await verifySession();
  const [orders, materials, payments, purchases, expenses, clients, settings] = await Promise.all([
    userCollection(uid, "orders").get(),
    userCollection(uid, "materials").orderBy("name").get(),
    userCollection(uid, "orderPayments").orderBy("date", "desc").get(),
    userCollection(uid, "materialPurchases").orderBy("date", "desc").get(),
    userCollection(uid, "businessExpenses").orderBy("date", "desc").get(),
    userCollection(uid, "clients").orderBy("name").get(),
    userCollection(uid, "settings").doc("business").get(),
  ]);
  const data = {
    orders: orders.docs.map(toOrder),
    materials: materials.docs.map(toMaterial),
    payments: payments.docs.map(toPayment),
    purchases: purchases.docs.map(toPurchase),
    expenses: expenses.docs.map(toExpense),
    clients: clients.docs.map(toClient),
    settings: {
      targetMargin: Number(settings.get("targetMargin")) || DEFAULT_SETTINGS.targetMargin,
    } satisfies BusinessSettings,
  };
  await linkOrphanOrders(uid, data.orders, data.clients);
  return data;
}

/**
 * Cobros y gastos del negocio de un rango, como movimientos de solo lectura para la home
 * (siempre impactan en el balance personal).
 */
export async function getBusinessHomeTransactions(range: DateRange): Promise<Transaction[]> {
  const { uid } = await verifySession();
  const byDate = (name: "orderPayments" | "materialPurchases" | "businessExpenses") => {
    const upTo = userCollection(uid, name).where("date", "<=", range.to);
    return (range.from ? upTo.where("date", ">=", range.from) : upTo).get();
  };
  const [payments, purchases, expenses] = await Promise.all([
    byDate("orderPayments"),
    byDate("materialPurchases"),
    byDate("businessExpenses"),
  ]);
  return businessHomeTransactions(
    payments.docs.map(toPayment),
    purchases.docs.map(toPurchase),
    expenses.docs.map(toExpense),
  );
}

/** Materiales con stock en o por debajo del mínimo (para el aviso de Bingo). */
export async function getLowStockMaterials(): Promise<Material[]> {
  const { uid } = await verifySession();
  const snap = await userCollection(uid, "materials").where("minStock", ">", 0).get();
  return snap.docs.map(toMaterial).filter(isLowStock);
}

/** Pedidos con entrega hasta dentro de una semana (para el aviso de Bingo en la home). */
export async function getNearOrders(today: string): Promise<Order[]> {
  const { uid } = await verifySession();
  const snap = await userCollection(uid, "orders")
    .where("deliveryDate", "<=", shiftDay(today, 7))
    .get();
  return snap.docs.map(toOrder);
}
