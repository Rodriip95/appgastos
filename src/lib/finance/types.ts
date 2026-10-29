import type { ColorKey, IconKey } from "@/lib/finance/catalog";

export type TxType = "income" | "expense";

export type Subcategory = { id: string; name: string };

export type Category = {
  id: string;
  type: TxType;
  name: string;
  description: string;
  icon: IconKey;
  color: ColorKey;
  subcategories: Subcategory[];
  /** Tope mensual de gasto (solo categorías de gasto); null = sin presupuesto */
  budget: number | null;
};

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM, derivado de `date`; se usa para consultar por mes */
  month: string;
  categoryId: string | null;
  subcategoryId: string | null;
  note: string;
  /** Gasto/ingreso fijo: se propone registrarlo cada mes */
  recurring: boolean;
  /** Tarjeta con la que se pagó (solo gastos) */
  cardId: string | null;
  /** Compra en cuotas a la que pertenece; todas sus cuotas comparten este id */
  purchaseId: string | null;
  /** Cuota n de total; null si no es una compra con tarjeta */
  installment: { n: number; total: number } | null;
  createdAt: number;
};

export type CreditCard = {
  id: string;
  name: string;
  /** Día de cierre del resumen (1–31; en meses más cortos, el último día) */
  closingDay: number;
  /** Día de vencimiento del resumen (1–31) */
  dueDay: number;
  color: ColorKey;
};

export type ActionResult = { ok: true } | { ok: false; error: string };
