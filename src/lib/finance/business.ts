import { shiftDay } from "@/lib/finance/format";
import type { Category, Transaction, TxType } from "@/lib/finance/types";

// Módulo Mi negocio (antes "Emprendimiento"). Lógica pura, usable en servidor y cliente.

/**
 * Pestañas de Mi negocio (`?t=`). Viven acá y no en `BusinessView` porque la página (servidor)
 * las usa: lo que se exporta de un módulo "use client" llega al servidor como referencia, no como valor.
 */
export const BUSINESS_TABS = ["resumen", "pedidos", "clientes", "stock", "gastos"] as const;
export type BusinessTab = (typeof BUSINESS_TABS)[number];

export const ORDER_STATUSES = ["taken", "in_progress", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const STATUS_LABEL: Record<OrderStatus, string> = {
  taken: "Tomado",
  in_progress: "En proceso",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const ORDER_PRIORITIES = ["high", "medium", "low"] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];
export const PRIORITY_LABEL: Record<OrderPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

/** Material usado en un pedido; nombre y precio quedan fijos aunque el material cambie. */
export type OrderMaterial = { materialId: string; name: string; qty: number; unitPrice: number };

export type Order = {
  id: string;
  /** Cliente de la libreta (`clients`); null en pedidos viejos todavía sin enlazar */
  clientId: string | null;
  /** Copia del nombre del cliente al guardar el pedido */
  client: string;
  phone: string;
  detail: string;
  amount: number;
  priority: OrderPriority;
  /** YYYY-MM-DD */
  deliveryDate: string;
  status: OrderStatus;
  materials: OrderMaterial[];
  /** Suma de los pagos; se actualiza en una transacción junto con cada pago */
  paid: number;
  createdAt: number;
};

export type Material = {
  id: string;
  name: string;
  /** Unidad de medida: "un", "m", "kg"… */
  unit: string;
  unitPrice: number;
  stock: number;
  /** Stock mínimo: con esto o menos, se avisa (0 = sin aviso) */
  minStock: number;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  note: string;
};

/** Conceptos de los gastos del negocio que no son compras de material. */
export const EXPENSE_CONCEPTS = [
  "shipping",
  "packaging",
  "tools",
  "marketing",
  "services",
  "other",
] as const;
export type ExpenseConcept = (typeof EXPENSE_CONCEPTS)[number];
export const CONCEPT_LABEL: Record<ExpenseConcept | "materials", string> = {
  materials: "Materiales",
  shipping: "Envíos",
  packaging: "Packaging",
  tools: "Herramientas",
  marketing: "Publicidad",
  services: "Servicios",
  other: "Otros",
};

export type BusinessExpense = {
  id: string;
  concept: ExpenseConcept;
  amount: number;
  date: string;
  month: string;
  /** Proveedor (texto libre; base para analizar proveedores) */
  supplier: string;
  note: string;
  createdAt: number;
};

export type BusinessSettings = {
  /** Margen objetivo sobre el precio (0–95), para sugerir precios */
  targetMargin: number;
};
export const DEFAULT_SETTINGS: BusinessSettings = { targetMargin: 50 };

export type OrderPayment = {
  id: string;
  orderId: string;
  client: string;
  amount: number;
  date: string;
  month: string;
  note: string;
  /** Ingreso creado en el resumen personal, si se eligió sumarlo */
  transactionId: string | null;
  createdAt: number;
};

export type MaterialPurchase = {
  id: string;
  materialId: string;
  name: string;
  qty: number;
  total: number;
  date: string;
  month: string;
  /** Proveedor (texto libre); vacío si no se cargó */
  supplier: string;
  createdAt: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const isOpen = (o: Pick<Order, "status">) => o.status === "taken" || o.status === "in_progress";

export const orderBalance = (o: Pick<Order, "amount" | "paid">) => round2(Math.max(0, o.amount - o.paid));

export const materialsCost = (o: Pick<Order, "materials">) =>
  round2(o.materials.reduce((sum, m) => sum + m.qty * m.unitPrice, 0));

export const stockValue = (materials: Material[]) =>
  round2(materials.reduce((sum, m) => sum + Math.max(0, m.stock) * m.unitPrice, 0));

/** Abiertos primero; dentro de cada grupo, por prioridad y fecha de entrega. */
export function sortOrders(orders: Order[]): Order[] {
  const rank = (o: Order) => ORDER_PRIORITIES.indexOf(o.priority);
  return [...orders].sort(
    (a, b) =>
      Number(isOpen(b)) - Number(isOpen(a)) ||
      (isOpen(a)
        ? rank(a) - rank(b) || a.deliveryDate.localeCompare(b.deliveryDate)
        : b.deliveryDate.localeCompare(a.deliveryDate)),
  );
}

/** Pedidos abiertos que se entregan en los próximos `days` días (incluye atrasados). */
export function upcomingDeliveries(orders: Order[], today: string, days = 7): Order[] {
  const limit = shiftDay(today, days);
  return orders
    .filter((o) => isOpen(o) && o.deliveryDate <= limit)
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
}

/** Rango de fechas inclusivo; `from` null = desde el principio. */
export type DateRange = { from: string | null; to: string };
const inRange = (date: string, { from, to }: DateRange) => (!from || date >= from) && date <= to;

export type BusinessData = {
  orders: Order[];
  materials: Material[];
  payments: OrderPayment[];
  purchases: MaterialPurchase[];
  expenses: BusinessExpense[];
  clients: Client[];
};

export type BusinessMetrics = {
  /** Cobros del período (caja) */
  income: number;
  /** Compras de material + otros gastos del período */
  expense: number;
  /** Ganancia de caja: cobrado − gastado */
  profit: number;
  /** Ganancia sobre lo cobrado, en % (null si no se cobró nada) */
  margin: number | null;
  /** Gastos por concepto, de mayor a menor */
  byConcept: { key: ExpenseConcept | "materials"; label: string; total: number }[];
  /** Pedidos entregados en el período (por fecha de entrega) */
  delivered: number;
  /** Precio promedio de los pedidos entregados */
  avgTicket: number | null;
  /** Margen promedio de los entregados, sobre el precio, descontando materiales (%) */
  avgOrderMargin: number | null;
  /** Saldo pendiente de todos los pedidos no cancelados (no depende del período) */
  toCollect: number;
  /** Clientes con más cobrado en el período */
  topClients: { name: string; total: number; orders: number }[];
};

/** Números del negocio en un período: caja (cobros − gastos) y desempeño de los pedidos. */
export function businessMetrics(data: BusinessData, range: DateRange): BusinessMetrics {
  const payments = data.payments.filter((p) => inRange(p.date, range));
  const purchases = data.purchases.filter((p) => inRange(p.date, range));
  const expenses = data.expenses.filter((e) => inRange(e.date, range));

  const income = round2(payments.reduce((s, p) => s + p.amount, 0));
  const concepts = new Map<ExpenseConcept | "materials", number>();
  for (const p of purchases) concepts.set("materials", (concepts.get("materials") ?? 0) + p.total);
  for (const e of expenses) concepts.set(e.concept, (concepts.get(e.concept) ?? 0) + e.amount);
  const expense = round2([...concepts.values()].reduce((s, v) => s + v, 0));
  const profit = round2(income - expense);

  const delivered = data.orders.filter((o) => o.status === "delivered" && inRange(o.deliveryDate, range));
  const priced = delivered.filter((o) => o.amount > 0);
  const avgTicket = priced.length ? round2(priced.reduce((s, o) => s + o.amount, 0) / priced.length) : null;
  const avgOrderMargin = priced.length
    ? Math.round(priced.reduce((s, o) => s + orderMargin(o), 0) / priced.length)
    : null;

  const byOrder = new Map(data.orders.map((o) => [o.id, o]));
  const clients = new Map<string, { name: string; total: number; orders: Set<string> }>();
  for (const p of payments) {
    const order = byOrder.get(p.orderId);
    const key = order?.clientId ?? normalizeName(p.client);
    const row = clients.get(key) ?? { name: order?.client ?? p.client, total: 0, orders: new Set<string>() };
    row.total += p.amount;
    row.orders.add(p.orderId);
    clients.set(key, row);
  }

  return {
    income,
    expense,
    profit,
    margin: income > 0 ? Math.round((profit / income) * 100) : null,
    byConcept: [...concepts]
      .map(([key, total]) => ({ key, label: CONCEPT_LABEL[key], total: round2(total) }))
      .sort((a, b) => b.total - a.total),
    delivered: delivered.length,
    avgTicket,
    avgOrderMargin,
    toCollect: round2(
      data.orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + orderBalance(o), 0),
    ),
    topClients: [...clients.values()]
      .map((c) => ({ name: c.name, total: round2(c.total), orders: c.orders.size }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
  };
}

/** Margen de un pedido sobre su precio, descontando los materiales (%). */
export function orderMargin(o: Pick<Order, "amount" | "materials">): number {
  if (o.amount <= 0) return 0;
  return Math.round(((o.amount - materialsCost(o)) / o.amount) * 100);
}

/** Precio sugerido para que los materiales dejen el margen objetivo (redondeado a $100). */
export function suggestedPrice(cost: number, targetMargin: number): number | null {
  if (cost <= 0 || targetMargin <= 0 || targetMargin >= 100) return null;
  return Math.ceil(cost / (1 - targetMargin / 100) / 100) * 100;
}

export const isLowStock = (m: Pick<Material, "stock" | "minStock">) => m.minStock > 0 && m.stock <= m.minStock;

/** Para agrupar clientes por nombre sin importar mayúsculas, tildes ni espacios. */
export const normalizeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export type ClientStats = {
  orders: number;
  /** Lo que pagó en total */
  paid: number;
  /** Lo que debe de pedidos no cancelados */
  owes: number;
  /** Fecha de entrega del último pedido */
  lastOrder: string | null;
};

/** Pedidos, cobrado y deuda de cada cliente (clientId → datos). */
export function clientStats(orders: Order[]): Map<string, ClientStats> {
  const out = new Map<string, ClientStats>();
  for (const o of orders) {
    if (!o.clientId) continue;
    const s = out.get(o.clientId) ?? { orders: 0, paid: 0, owes: 0, lastOrder: null };
    if (o.status !== "cancelled") {
      s.orders += 1;
      s.owes = round2(s.owes + orderBalance(o));
    }
    s.paid = round2(s.paid + o.paid);
    if (!s.lastOrder || o.deliveryDate > s.lastOrder) s.lastOrder = o.deliveryDate;
    out.set(o.clientId, s);
  }
  return out;
}

// ---- Impacto en la home ----

/** Clave de la fila "Mi negocio" en el desglose y en el filtro de movimientos de la home. */
export const BUSINESS_KEY = "business";

/** Categoría sintética con la que el negocio aparece en la home (no existe en Firestore). */
export function businessCategory(type: TxType): Category {
  return {
    id: BUSINESS_KEY,
    type,
    name: "Mi negocio",
    description: "",
    icon: "store",
    color: "violet",
    subcategories:
      type === "income"
        ? [{ id: "payments", name: "Cobros de pedidos" }]
        : (["materials", ...EXPENSE_CONCEPTS] as const).map((k) => ({ id: k, name: CONCEPT_LABEL[k] })),
    budget: null,
  };
}

function homeTx(
  id: string,
  type: TxType,
  amount: number,
  date: string,
  subcategoryId: string,
  note: string,
  createdAt: number,
): Transaction {
  return {
    id: `business:${id}`,
    type,
    amount,
    currency: "ARS",
    arsRate: null,
    date,
    month: date.slice(0, 7),
    categoryId: BUSINESS_KEY,
    subcategoryId,
    note,
    alias: "",
    recurring: false,
    cardId: null,
    purchaseId: null,
    installment: null,
    sharedSpaceId: null,
    business: true,
    createdAt,
  };
}

/**
 * Cobros y gastos del negocio como movimientos de solo lectura para la home.
 * Los cobros que ya se sumaron a mano al resumen (opción vieja, `transactionId`) no se repiten.
 */
export function businessHomeTransactions(
  payments: OrderPayment[],
  purchases: MaterialPurchase[],
  expenses: BusinessExpense[],
): Transaction[] {
  return [
    ...payments
      .filter((p) => !p.transactionId)
      .map((p) =>
        homeTx(`p:${p.id}`, "income", p.amount, p.date, "payments", `Pedido de ${p.client}${p.note ? ` · ${p.note}` : ""}`, p.createdAt),
      ),
    ...purchases.map((p) =>
      homeTx(`m:${p.id}`, "expense", p.total, p.date, "materials", `${p.name} × ${p.qty}`, p.createdAt),
    ),
    ...expenses.map((e) =>
      homeTx(
        `e:${e.id}`,
        "expense",
        e.amount,
        e.date,
        e.concept,
        e.note || [CONCEPT_LABEL[e.concept], e.supplier].filter(Boolean).join(" · "),
        e.createdAt,
      ),
    ),
  ];
}

/** Enlace de WhatsApp del teléfono del cliente; null si no tiene dígitos suficientes. */
export function whatsappHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
