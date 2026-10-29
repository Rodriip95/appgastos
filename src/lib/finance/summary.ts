import type { Category, Transaction, TxType } from "@/lib/finance/types";

export type BreakdownRow = {
  key: string;
  category: Category | null;
  total: number;
  /** 0–100 respecto del total del tipo */
  pct: number;
  /** Total de la misma categoría el mes anterior (0 si no hubo) */
  prevTotal: number;
  subs: { key: string; name: string; total: number }[];
};

export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
  breakdown: Record<TxType, BreakdownRow[]>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarizeMonth(
  transactions: Transaction[],
  categories: Category[],
  prevTransactions: Transaction[] = [],
): MonthSummary {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals: Record<TxType, number> = { income: 0, expense: 0 };
  const groups: Record<TxType, Map<string, BreakdownRow>> = { income: new Map(), expense: new Map() };

  for (const tx of transactions) {
    totals[tx.type] += tx.amount;

    const category = (tx.categoryId && byId.get(tx.categoryId)) || null;
    const key = category?.id ?? "none";
    const row = groups[tx.type].get(key) ?? { key, category, total: 0, pct: 0, prevTotal: 0, subs: [] };
    row.total += tx.amount;

    const subName =
      category?.subcategories.find((s) => s.id === tx.subcategoryId)?.name ?? "Sin subcategoría";
    const subKey = tx.subcategoryId ?? "none";
    const sub = row.subs.find((s) => s.key === subKey);
    if (sub) sub.total += tx.amount;
    else row.subs.push({ key: subKey, name: subName, total: tx.amount });

    groups[tx.type].set(key, row);
  }

  const prevByKey = new Map<string, number>();
  for (const tx of prevTransactions) {
    const key = `${tx.type}:${(tx.categoryId && byId.has(tx.categoryId) && tx.categoryId) || "none"}`;
    prevByKey.set(key, (prevByKey.get(key) ?? 0) + tx.amount);
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

  return {
    income: round2(totals.income),
    expense: round2(totals.expense),
    balance: round2(totals.income - totals.expense),
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
