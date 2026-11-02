import { toArs } from "@/lib/finance/currency";
import type { Category, CreditCard, Transaction, TxType } from "@/lib/finance/types";

export type BreakdownRow = {
  /** id de la categoría, "none" o `card:<id>` si agrupa los consumos de una tarjeta */
  key: string;
  category: Category | null;
  /** Tarjeta cuyos consumos agrupa la fila (solo con `groupCards`) */
  card: Pick<CreditCard, "id" | "name" | "color"> | null;
  total: number;
  /** 0–100 respecto del total del tipo */
  pct: number;
  /** Total de la misma categoría el mes anterior (0 si no hubo) */
  prevTotal: number;
  subs: { key: string; name: string; total: number }[];
};

export type Totals = { income: number; expense: number; balance: number };

/**
 * Totales de un conjunto de movimientos. `income`/`expense`/`balance` y el desglose están
 * en pesos, con los dólares sumados por su equivalente (cotización guardada en cada uno).
 * `ars` y `usd` separan lo que efectivamente fue en cada moneda; `usd` es null si no hubo dólares.
 */
export type MonthSummary = Totals & {
  ars: Totals;
  usd: Totals | null;
  breakdown: Record<TxType, BreakdownRow[]>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Con `groupCards`, los gastos con tarjeta van en una fila por tarjeta (con un renglón por
 * consumo: su alias o, si no tiene, la categoría) en vez de repartirse en las categorías.
 */
export function summarizeMonth(
  transactions: Transaction[],
  categories: Category[],
  prevTransactions: Transaction[] = [],
  { groupCards }: { groupCards?: CreditCard[] } = {},
): MonthSummary {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const cardById = new Map((groupCards ?? []).map((c) => [c.id, c]));
  const cardOf = (tx: Transaction) => (tx.type === "expense" && tx.cardId && cardById.get(tx.cardId)) || null;
  const totals: Record<TxType, number> = { income: 0, expense: 0 };
  const byCurrency = { ARS: { income: 0, expense: 0 }, USD: { income: 0, expense: 0 } };
  let hasUsd = false;
  const groups: Record<TxType, Map<string, BreakdownRow>> = { income: new Map(), expense: new Map() };

  for (const tx of transactions) {
    const value = toArs(tx);
    totals[tx.type] += value;
    byCurrency[tx.currency][tx.type] += tx.amount;
    if (tx.currency === "USD") hasUsd = true;

    const category = (tx.categoryId && byId.get(tx.categoryId)) || null;
    const card = cardOf(tx);
    if (card) {
      const key = `card:${card.id}`;
      const row = groups.expense.get(key) ?? {
        key,
        category: null,
        card: { id: card.id, name: card.name, color: card.color },
        total: 0,
        pct: 0,
        prevTotal: 0,
        subs: [],
      };
      row.total += value;
      const cuota = tx.installment && tx.installment.total > 1 ? ` · ${tx.installment.n}/${tx.installment.total}` : "";
      row.subs.push({ key: tx.id, name: `${tx.alias || category?.name || "Sin categoría"}${cuota}`, total: value });
      groups.expense.set(key, row);
      continue;
    }
    const key = category?.id ?? "none";
    const row = groups[tx.type].get(key) ?? { key, category, card: null, total: 0, pct: 0, prevTotal: 0, subs: [] };
    row.total += value;

    const subName =
      category?.subcategories.find((s) => s.id === tx.subcategoryId)?.name ?? "Sin subcategoría";
    const subKey = tx.subcategoryId ?? "none";
    const sub = row.subs.find((s) => s.key === subKey);
    if (sub) sub.total += value;
    else row.subs.push({ key: subKey, name: subName, total: value });

    groups[tx.type].set(key, row);
  }

  const prevByKey = new Map<string, number>();
  for (const tx of prevTransactions) {
    const card = cardOf(tx);
    const key = card
      ? `expense:card:${card.id}`
      : `${tx.type}:${(tx.categoryId && byId.has(tx.categoryId) && tx.categoryId) || "none"}`;
    prevByKey.set(key, (prevByKey.get(key) ?? 0) + toArs(tx));
  }

  const toRows = (type: TxType) =>
    [...groups[type].values()]
      .map((r) => ({
        ...r,
        total: round2(r.total),
        pct: totals[type] ? (r.total / totals[type]) * 100 : 0,
        prevTotal: round2(prevByKey.get(`${type}:${r.key}`) ?? 0),
        subs: r.subs.map((s) => ({ ...s, total: round2(s.total) })).sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);

  const toTotals = (t: Record<TxType, number>): Totals => ({
    income: round2(t.income),
    expense: round2(t.expense),
    balance: round2(t.income - t.expense),
  });

  return {
    ...toTotals(totals),
    ars: toTotals(byCurrency.ARS),
    usd: hasUsd ? toTotals(byCurrency.USD) : null,
    breakdown: { income: toRows("income"), expense: toRows("expense") },
  };
}

// ---- Insights del mes ----

/** Variación porcentual redondeada; null si no hay base para comparar. */
export function changePct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Proyección del gasto a fin de mes según el ritmo diario actual.
 * Solo tiene sentido para el mes en curso y a partir del día 3 (antes es ruido).
 */
export function projectMonthExpense(expense: number, today: string, month: string): number | null {
  if (today.slice(0, 7) !== month) return null;
  const day = Number(today.slice(8, 10));
  if (day < 3 || expense <= 0) return null;
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.round((expense / day) * daysInMonth);
}

/** Veces que se usó cada categoría, para ordenar las más frecuentes primero. */
export function categoryUsage(transactions: Transaction[]): Record<string, number> {
  const usage: Record<string, number> = {};
  for (const t of transactions) if (t.categoryId) usage[t.categoryId] = (usage[t.categoryId] ?? 0) + 1;
  return usage;
}

const recurringKey = (t: Transaction) =>
  [t.type, t.categoryId ?? "", t.subcategoryId ?? "", t.note.trim().toLowerCase()].join("|");

/**
 * Movimientos fijos del mes anterior que todavía no se registraron este mes
 * (mismo tipo, categoría, subcategoría y descripción). Las cuotas de tarjeta no cuentan.
 */
export function pendingRecurring(prev: Transaction[], current: Transaction[]): Transaction[] {
  const done = new Set(current.map(recurringKey));
  const seen = new Set<string>();
  return prev.filter((t) => {
    if (!t.recurring || t.purchaseId) return false;
    const key = recurringKey(t);
    if (done.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
