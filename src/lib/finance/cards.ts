import { sumByCurrency, type CurrencyTotals } from "@/lib/finance/currency";
import { lastDayOfMonth, shiftDay, shiftMonth } from "@/lib/finance/format";
import type { CreditCard, Currency, Transaction } from "@/lib/finance/types";

// Lógica pura de tarjetas: en qué resumen cae una compra, cuándo vence cada
// cuota y qué vencimientos se acercan. Todo con fechas como strings.

type CardDays = Pick<CreditCard, "closingDay" | "dueDay">;

/** Día `day` del mes, o el último día si el mes es más corto. */
export function dayInMonth(month: string, day: number): string {
  const last = lastDayOfMonth(month);
  return Number(last.slice(8)) < day ? last : `${month}-${String(day).padStart(2, "0")}`;
}

/** Mes en que vence el resumen que cierra en `closingMonth`. */
function dueMonthFor(card: CardDays, closingMonth: string): string {
  // Si el vencimiento es antes (o igual) que el cierre, cae el mes siguiente: cierre 25 → vence 5.
  return card.dueDay > card.closingDay ? closingMonth : shiftMonth(closingMonth, 1);
}

/** Fecha de vencimiento de la primera cuota de una compra hecha en `purchaseDate`. */
export function firstDueDate(card: CardDays, purchaseDate: string): string {
  const month = purchaseDate.slice(0, 7);
  // Una compra posterior al cierre entra en el resumen siguiente.
  const closingMonth = purchaseDate <= dayInMonth(month, card.closingDay) ? month : shiftMonth(month, 1);
  return dayInMonth(dueMonthFor(card, closingMonth), card.dueDay);
}

export type Installment = { n: number; total: number; date: string; month: string; amount: number };

/**
 * Divide una compra en cuotas mensuales. Cada cuota se fecha en el vencimiento
 * del resumen que la cobra; la última absorbe los centavos del redondeo.
 */
export function installmentSchedule(
  card: CardDays,
  purchaseDate: string,
  amount: number,
  count: number,
): Installment[] {
  const firstMonth = firstDueDate(card, purchaseDate).slice(0, 7);
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / count);
  return Array.from({ length: count }, (_, i) => {
    const month = shiftMonth(firstMonth, i);
    const share = i === count - 1 ? cents - base * (count - 1) : base;
    return { n: i + 1, total: count, date: dayInMonth(month, card.dueDay), month, amount: share / 100 };
  });
}

/** Próximo vencimiento de la tarjeta a partir de hoy (incluido). */
export function nextDueDate(card: CardDays, today: string): string {
  const thisMonth = dayInMonth(today.slice(0, 7), card.dueDay);
  return thisMonth >= today ? thisMonth : dayInMonth(shiftMonth(today.slice(0, 7), 1), card.dueDay);
}

/** Días entre dos fechas YYYY-MM-DD. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Total de la tarjeta en el resumen que vence en `month`, en pesos y en dólares (como el resumen del banco). */
export function statementTotal(cardId: string, month: string, transactions: Transaction[]): CurrencyTotals {
  return sumByCurrency(transactions.filter((t) => t.cardId === cardId && t.month === month));
}

/** Clave de un resumen: tarjeta + mes en que vence. */
export const statementKey = (cardId: string, month: string) => `${cardId}:${month}`;

/** Cuota de una tarjeta que existe (las de tarjetas eliminadas se tratan como gastos comunes). */
export function cardOf<T extends Pick<CreditCard, "id">>(t: Pick<Transaction, "cardId">, cards: T[]): T | null {
  return (t.cardId && cards.find((c) => c.id === t.cardId)) || null;
}

/**
 * Movimientos que cuentan en el balance: una cuota de tarjeta solo cuenta como gasto
 * cuando el resumen de ese mes está marcado como pagado.
 */
export function countedTransactions<T extends Transaction>(
  list: T[],
  cards: Pick<CreditCard, "id">[],
  paid: string[],
): T[] {
  const paidSet = new Set(paid);
  return list.filter((t) => !cardOf(t, cards) || paidSet.has(statementKey(t.cardId!, t.month)));
}

/** Nombre corto de un consumo: el alias si tiene; si no, la descripción del comercio. */
export const consumptionLabel = (t: Pick<Transaction, "alias" | "note">) => t.alias || t.note;

export type UpcomingDue = {
  card: CreditCard;
  date: string;
  daysLeft: number;
  /** Total en pesos del resumen */
  amount: number;
  /** Total en dólares del resumen */
  usd: number;
};

/** Vencimientos de los próximos `withinDays` días, del más cercano al más lejano. Los pagados no se avisan. */
export function upcomingDues(
  cards: CreditCard[],
  transactions: Transaction[],
  today: string,
  withinDays = 7,
  paid: string[] = [],
): UpcomingDue[] {
  const limit = shiftDay(today, withinDays);
  return cards
    .filter((card) => !paid.includes(statementKey(card.id, nextDueDate(card, today).slice(0, 7))))
    .map((card) => {
      const date = nextDueDate(card, today);
      const total = statementTotal(card.id, date.slice(0, 7), transactions);
      return { card, date, daysLeft: daysBetween(today, date), amount: total.ars, usd: total.usd };
    })
    .filter((d) => d.date <= limit)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type CardPurchase = {
  purchaseId: string;
  note: string;
  alias: string;
  currency: Currency;
  installments: number;
  /** Cuotas que vencen desde el mes actual en adelante */
  remaining: number;
  perInstallment: number;
  /** Lo que falta pagar de la compra */
  remainingAmount: number;
};

/** Agrupa las cuotas pendientes de una tarjeta por compra. */
export function activePurchases(cardId: string, upcoming: Transaction[]): CardPurchase[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of upcoming) {
    if (t.cardId !== cardId || !t.purchaseId) continue;
    groups.set(t.purchaseId, [...(groups.get(t.purchaseId) ?? []), t]);
  }
  return [...groups].map(([purchaseId, items]) => {
    return {
      purchaseId,
      note: items[0].note,
      alias: items[0].alias,
      currency: items[0].currency,
      installments: items[0].installment?.total ?? items.length,
      remaining: items.length,
      perInstallment: items[0].amount,
      remainingAmount: round2(items.reduce((s, t) => s + t.amount, 0)),
    };
  });
}

/**
 * Cuotas que quedan de una compra leída de un resumen: la cuota `n` de `total`
 * cae en el resumen que vence en `month` y las siguientes en los meses que siguen.
 * Las cuotas anteriores ya se pagaron y no se cargan.
 */
export function remainingInstallments(
  card: Pick<CreditCard, "dueDay">,
  month: string,
  perInstallment: number,
  n: number,
  total: number,
): Installment[] {
  return Array.from({ length: total - n + 1 }, (_, i) => {
    const m = shiftMonth(month, i);
    return { n: n + i, total, date: dayInMonth(m, card.dueDay), month: m, amount: perInstallment };
  });
}
