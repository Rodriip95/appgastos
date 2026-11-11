import { shiftDay } from "@/lib/finance/format";
import type { Category, Transaction, TxType } from "@/lib/finance/types";

// Módulo Mi negocio (antes "Emprendimiento"). Lógica pura, usable en servidor y cliente.

/**
 * Pestañas viejas de Mi negocio (`/negocio?t=`) → pantalla que las reemplaza (`/negocio/<sección>`).
 * Se mantienen para enlaces guardados y avisos ya enviados.
 */
export const LEGACY_BUSINESS_TABS: Record<string, string> = {
  resumen: "numeros",
  calendario: "agenda",
  pedidos: "pedidos",
  clientes: "clientes",
  stock: "stock",
  gastos: "gastos",
};

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

/** Pedido (se entrega un día) o turno (el cliente viene a una hora, ej. un corte). */
export const ORDER_KINDS = ["order", "appointment"] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];

/** Estados con el nombre que corresponde a un turno. */
export const APPOINTMENT_STATUS_LABEL: Record<OrderStatus, string> = {
  taken: "Agendado",
  in_progress: "En curso",
  delivered: "Atendido",
  cancelled: "Cancelado",
};
export const statusLabel = (o: Pick<Order, "kind" | "status">) =>
  (o.kind === "appointment" ? APPOINTMENT_STATUS_LABEL : STATUS_LABEL)[o.status];

/** Servicio que se cobra sin stock (ej. "Corte"); se carga en la pestaña Stock. */
export type Service = {
  id: string;
  name: string;
  price: number;
  /** Duración en minutos (0 = sin indicar) */
  duration: number;
};

/** Servicio de un turno; nombre, precio y duración quedan fijos aunque el servicio cambie. */
export type OrderService = { serviceId: string; name: string; price: number; duration: number };

/** Material usado en un pedido; nombre y precio quedan fijos aunque el material cambie. */
export type OrderMaterial = { materialId: string; name: string; qty: number; unitPrice: number };

export type Order = {
  id: string;
  /** Sin dato = pedido */
  kind: OrderKind;
  /** Cliente de la libreta (`clients`); null en pedidos viejos todavía sin enlazar */
  clientId: string | null;
  /** Copia del nombre del cliente al guardar el pedido */
  client: string;
  phone: string;
  detail: string;
  amount: number;
  priority: OrderPriority;
  /** YYYY-MM-DD: entrega del pedido o día del turno */
  deliveryDate: string;
  /** Hora del turno ("HH:MM"); null en pedidos */
  time: string | null;
  status: OrderStatus;
  materials: OrderMaterial[];
  /** Servicios del turno (vacío en pedidos) */
  services: OrderService[];
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

/** Pedidos y turnos abiertos de los próximos `days` días (incluye pedidos atrasados, no turnos pasados). */
export function upcomingDeliveries(orders: Order[], today: string, days = 7): Order[] {
  const limit = shiftDay(today, days);
  return orders
    .filter((o) => isOpen(o) && o.deliveryDate <= limit && (o.kind === "order" || o.deliveryDate >= today))
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || (a.time ?? "99").localeCompare(b.time ?? "99"));
}

// ---- Calendario ----

/** "HH:MM" + minutos → "HH:MM" (sin pasar de 23:59). */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export const servicesDuration = (o: Pick<Order, "services">) => o.services.reduce((s, x) => s + x.duration, 0);

/** "10:00–10:45" si el turno tiene duración; "10:00" si no; null si no tiene hora. */
export function timeRange(o: Pick<Order, "time" | "services">): string | null {
  if (!o.time) return null;
  const minutes = servicesDuration(o);
  return minutes > 0 ? `${o.time}–${addMinutes(o.time, minutes)}` : o.time;
}

/** Qué se hace en el turno o pedido, en una línea: servicios o el detalle. */
export const orderTitle = (o: Pick<Order, "services" | "detail">) =>
  o.services.length ? o.services.map((s) => s.name).join(" + ") : o.detail.split("\n")[0];

/** Agenda de un día: turnos por hora y después las entregas. Los cancelados van al final. */
export function dayAgenda(orders: Order[], date: string): Order[] {
  return orders
    .filter((o) => o.deliveryDate === date)
    .sort(
      (a, b) =>
        Number(a.status === "cancelled") - Number(b.status === "cancelled") ||
        (a.time ?? "99").localeCompare(b.time ?? "99") ||
        a.createdAt - b.createdAt,
    );
}

/** Por día del mes (YYYY-MM-DD): cuántos turnos y entregas no cancelados hay. */
export function monthMarks(orders: Order[], month: string): Map<string, { appointments: number; deliveries: number }> {
  const out = new Map<string, { appointments: number; deliveries: number }>();
  for (const o of orders) {
    if (o.status === "cancelled" || !o.deliveryDate.startsWith(month)) continue;
    const mark = out.get(o.deliveryDate) ?? { appointments: 0, deliveries: 0 };
    if (o.kind === "appointment") mark.appointments += 1;
    else mark.deliveries += 1;
    out.set(o.deliveryDate, mark);
  }
  return out;
}

/** Aviso del día ("Hoy tienes 2 turnos y 1 entrega"); null si no hay nada abierto hoy. */
export function todayAgendaPush(orders: Order[], today: string): { title: string; body: string } | null {
  const agenda = dayAgenda(orders, today).filter(isOpen);
  if (agenda.length === 0) return null;
  const turns = agenda.filter((o) => o.kind === "appointment").length;
  const deliveries = agenda.length - turns;
  const parts = [
    turns ? `${turns} ${turns === 1 ? "turno" : "turnos"}` : null,
    deliveries ? `${deliveries} ${deliveries === 1 ? "entrega" : "entregas"}` : null,
  ].filter(Boolean);
  const lines = agenda
    .slice(0, 4)
    .map((o) =>
      o.kind === "appointment"
        ? `${o.time ?? "Sin hora"} ${o.client}${o.services.length ? ` (${orderTitle(o)})` : ""}`
        : `Entrega de ${o.client}`,
    );
  if (agenda.length > 4) lines.push(`y ${agenda.length - 4} más`);
  return { title: `Hoy tienes ${parts.join(" y ")}`, body: lines.join(" · ") };
}

/** Rango de fechas inclusivo; `from` null = desde el principio. */
export type DateRange = { from: string | null; to: string };
const inRange = (date: string, { from, to }: DateRange) => (!from || date >= from) && date <= to;

export type BusinessData = {
  orders: Order[];
  materials: Material[];
  services: Service[];
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
