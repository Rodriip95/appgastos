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

/** Meta de ahorro: un objetivo con monto y, opcionalmente, fecha límite. */
export type Goal = {
  id: string;
  name: string;
  /** Monto objetivo */
  target: number;
  /** Fecha objetivo (YYYY-MM-DD) o null si no tiene */
  targetDate: string | null;
  icon: IconKey;
  color: ColorKey;
  /** Lo reservado hasta hoy (suma de aportes menos retiros) */
  saved: number;
};

/** Aporte (+) o retiro (−) de dinero reservado para una meta. */
export type GoalMovement = {
  id: string;
  goalId: string;
  /** Positivo = aporte; negativo = retiro */
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM, derivado de `date` */
  month: string;
  note: string;
  createdAt: number;
};

/** Datos públicos mínimos de una persona, para mostrarla en contactos. */
export type Person = {
  uid: string;
  name: string;
  email: string;
  photo: string | null;
};

/** Contacto aceptado (copia de los datos de la persona al momento de aceptar). */
export type Contact = Person & {
  /** Epoch ms de cuando se aceptó */
  since: number;
};

/** Solicitud de contacto pendiente; `from` y `to` son copias de los datos de cada persona. */
export type ContactRequest = {
  id: string;
  from: Person;
  to: Person;
  createdAt: number;
};

export type SharedMemberStatus = "pending" | "accepted" | "left";

export type SharedMember = Person & { status: SharedMemberStatus };

/** Espacio compartido entre contactos (hoy: gastos compartidos, p. ej. un auto). */
export type SharedSpace = {
  id: string;
  kind: "expenses";
  name: string;
  icon: IconKey;
  color: ColorKey;
  /** Quien lo creó (puede quitar miembros y eliminarlo) */
  createdBy: string;
  /** Todos los que alguna vez participaron; el historial conserva a quienes se fueron */
  members: SharedMember[];
  /** Subcategorías propias del espacio (nafta, service, seguro…) */
  subcategories: Subcategory[];
};

/**
 * Movimiento de un espacio de gastos. Los montos van en centavos enteros para que
 * los repartos no acumulen errores de redondeo.
 * - expense: `paidBy` pagó `amountCents` y `split` indica cuánto le toca a cada uno.
 * - settlement: `paidBy` le pasó dinero a quien figura en `split`.
 */
export type SharedEntry = {
  id: string;
  type: "expense" | "settlement";
  paidBy: string;
  amountCents: number;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM, derivado de `date` */
  month: string;
  subcategoryId: string | null;
  note: string;
  /** uid → centavos que le corresponden (suma = amountCents) */
  split: Record<string, number>;
  createdBy: string;
  createdAt: number;
};

export type ActionResult = { ok: true } | { ok: false; error: string };
