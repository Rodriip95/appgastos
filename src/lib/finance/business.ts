import { shiftDay } from "@/lib/finance/format";

// Módulo Emprendimiento. Lógica pura, usable en servidor y cliente.

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
};

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

export type BusinessMonth = { month: string; income: number; expense: number; balance: number };

/** Balance de caja mes a mes: cobros menos compras de materiales, del más reciente al más antiguo. */
export function businessBalance(
  payments: Pick<OrderPayment, "month" | "amount">[],
  purchases: Pick<MaterialPurchase, "month" | "total">[],
): BusinessMonth[] {
  const months = new Map<string, BusinessMonth>();
  const row = (month: string) => {
    const r = months.get(month) ?? { month, income: 0, expense: 0, balance: 0 };
    months.set(month, r);
    return r;
  };
  for (const p of payments) row(p.month).income += p.amount;
  for (const p of purchases) row(p.month).expense += p.total;
  return [...months.values()]
    .map((r) => ({
      month: r.month,
      income: round2(r.income),
      expense: round2(r.expense),
      balance: round2(r.income - r.expense),
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

/** Enlace de WhatsApp del teléfono del cliente; null si no tiene dígitos suficientes. */
export function whatsappHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
