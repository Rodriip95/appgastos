import type { SharedEntry } from "@/lib/finance/types";

// Lógica pura de gastos compartidos. Todo en centavos enteros.

export const toCents = (amount: number) => Math.round(amount * 100);
export const fromCents = (cents: number) => cents / 100;

/** Reparte `total` en partes iguales; los centavos sobrantes van a los primeros. */
export function splitEqual(total: number, uids: string[]): Record<string, number> {
  const base = Math.floor(total / uids.length);
  let extra = total - base * uids.length;
  const split: Record<string, number> = {};
  for (const uid of uids) {
    split[uid] = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
  }
  return split;
}

export type PersonTotals = {
  /** Lo que pagó de su bolsillo (gastos + pagos de ajuste) */
  paid: number;
  /** Lo que le corresponde (gastos + ajustes recibidos) */
  share: number;
  /** paid − share: positivo = puso de más */
  net: number;
};

export type Balance = {
  /** Gastos del espacio (los ajustes no cuentan) */
  total: number;
  people: Record<string, PersonTotals>;
};

const emptyPeople = (uids: string[]) =>
  Object.fromEntries(uids.map((uid) => [uid, { paid: 0, share: 0, net: 0 }])) as Record<string, PersonTotals>;

function accumulate(people: Record<string, PersonTotals>, entry: SharedEntry) {
  const payer = (people[entry.paidBy] ??= { paid: 0, share: 0, net: 0 });
  payer.paid += entry.amountCents;
  for (const [uid, cents] of Object.entries(entry.split)) {
    (people[uid] ??= { paid: 0, share: 0, net: 0 }).share += cents;
  }
}

function finish(people: Record<string, PersonTotals>) {
  for (const p of Object.values(people)) p.net = p.paid - p.share;
}

/**
 * Un ajuste (A le pasa a B) se cuenta como que A pagó y a B le corresponde,
 * así deja el neto de ambos más cerca de cero sin tratarlo como gasto.
 */
export function computeBalance(entries: SharedEntry[], uids: string[]): Balance {
  const people = emptyPeople(uids);
  let total = 0;
  for (const e of entries) {
    accumulate(people, e);
    if (e.type === "expense") total += e.amountCents;
  }
  finish(people);
  return { total, people };
}

export type SubcategoryBalance = Balance & { subcategoryId: string | null };

/** Balance de los gastos separado por subcategoría (los ajustes no pertenecen a ninguna). */
export function balanceBySubcategory(entries: SharedEntry[], uids: string[]): SubcategoryBalance[] {
  const groups = new Map<string | null, SharedEntry[]>();
  for (const e of entries) {
    if (e.type !== "expense") continue;
    groups.set(e.subcategoryId, [...(groups.get(e.subcategoryId) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([subcategoryId, list]) => ({ subcategoryId, ...computeBalance(list, uids) }))
    .sort((a, b) => b.total - a.total);
}
