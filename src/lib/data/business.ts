import "server-only";
import type { QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { verifySession } from "@/lib/auth/session";
import { userCollection } from "@/lib/data/collections";
import type {
  Material,
  MaterialPurchase,
  Order,
  OrderPayment,
  OrderPriority,
  OrderStatus,
} from "@/lib/finance/business";
import { shiftDay } from "@/lib/finance/format";

const millis = (doc: QueryDocumentSnapshot) =>
  (doc.get("createdAt") as Timestamp | undefined)?.toMillis() ?? 0;

export function toOrder(doc: QueryDocumentSnapshot): Order {
  const d = doc.data();
  return {
    id: doc.id,
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
    createdAt: millis(doc),
  };
}

/** Todo lo del módulo Emprendimiento (`/emprendimiento`). */
export async function getBusinessData() {
  const { uid } = await verifySession();
  const [orders, materials, payments, purchases] = await Promise.all([
    userCollection(uid, "orders").get(),
    userCollection(uid, "materials").orderBy("name").get(),
    userCollection(uid, "orderPayments").orderBy("date", "desc").get(),
    userCollection(uid, "materialPurchases").orderBy("date", "desc").get(),
  ]);
  return {
    orders: orders.docs.map(toOrder),
    materials: materials.docs.map(toMaterial),
    payments: payments.docs.map(toPayment),
    purchases: purchases.docs.map(toPurchase),
  };
}

/** Pedidos con entrega hasta dentro de una semana (para el aviso de Bingo en la home). */
export async function getNearOrders(today: string): Promise<Order[]> {
  const { uid } = await verifySession();
  const snap = await userCollection(uid, "orders")
    .where("deliveryDate", "<=", shiftDay(today, 7))
    .get();
  return snap.docs.map(toOrder);
}
