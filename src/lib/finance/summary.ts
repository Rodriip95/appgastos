import type { Category, Transaction, TxType } from "@/lib/finance/types";

export type BreakdownRow = {
  key: string;
  category: Category | null;
  total: number;
  /** 0–100 respecto del total del tipo */
  pct: number;
  subs: { key: string; name: string; total: number }[];
};

export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
  breakdown: Record<TxType, BreakdownRow[]>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarizeMonth(transactions: Transaction[], categories: Category[]): MonthSummary {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals: Record<TxType, number> = { income: 0, expense: 0 };
  const groups: Record<TxType, Map<string, BreakdownRow>> = { income: new Map(), expense: new Map() };

  for (const tx of transactions) {
    totals[tx.type] += tx.amount;

    const category = (tx.categoryId && byId.get(tx.categoryId)) || null;
    const key = category?.id ?? "none";
    const row = groups[tx.type].get(key) ?? { key, category, total: 0, pct: 0, subs: [] };
    row.total += tx.amount;

    const subName =
      category?.subcategories.find((s) => s.id === tx.subcategoryId)?.name ?? "Sin subcategoría";
    const subKey = tx.subcategoryId ?? "none";
    const sub = row.subs.find((s) => s.key === subKey);
    if (sub) sub.total += tx.amount;
    else row.subs.push({ key: subKey, name: subName, total: tx.amount });

    groups[tx.type].set(key, row);
  }

  const toRows = (type: TxType) =>
    [...groups[type].values()]
      .map((r) => ({
        ...r,
        total: round2(r.total),
        pct: totals[type] ? (r.total / totals[type]) * 100 : 0,
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
