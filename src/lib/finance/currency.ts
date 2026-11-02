import { formatMoney } from "@/lib/finance/format";
import type { Currency, Transaction } from "@/lib/finance/types";

// Lógica pura de monedas. Los movimientos en dólares se guardan en dólares (nunca se
// convierten); el equivalente en pesos usa la cotización guardada al registrarlos.

export type UsdRate = {
  /** Casa de dolarapi.com: "oficial", "tarjeta", "blue"… */
  kind: string;
  /** Pesos por dólar (precio de venta) */
  rate: number;
  /** YYYY-MM-DD de la cotización */
  date: string;
};

export const currencyOf = (t: { currency?: Currency | null }): Currency => (t.currency === "USD" ? "USD" : "ARS");

/** Equivalente en pesos de un movimiento; un USD sin cotización vale 0 (no se inventa). */
export function toArs(t: Pick<Transaction, "amount" | "currency" | "arsRate">): number {
  return t.currency === "USD" ? Math.round(t.amount * (t.arsRate ?? 0) * 100) / 100 : t.amount;
}

/** Completa con `rate` la cotización de los movimientos en USD que no la tienen guardada. */
export function fillRates<T extends Transaction>(list: T[], rate: number | null): T[] {
  if (!rate) return list;
  return list.map((t) => (t.currency === "USD" && !t.arsRate ? { ...t, arsRate: rate } : t));
}

/** Nombre del dólar para mostrar: "oficial" → "dólar oficial". */
export function rateLabel(kind: string): string {
  const names: Record<string, string> = {
    oficial: "dólar oficial",
    tarjeta: "dólar tarjeta",
    blue: "dólar blue",
    bolsa: "dólar MEP",
    contadoconliqui: "dólar CCL",
    mayorista: "dólar mayorista",
    cripto: "dólar cripto",
  };
  return names[kind] ?? `dólar ${kind}`;
}

export type CurrencyTotals = { ars: number; usd: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Suma montos separando pesos y dólares. */
export function sumByCurrency(list: Pick<Transaction, "amount" | "currency">[]): CurrencyTotals {
  const t = { ars: 0, usd: 0 };
  for (const x of list) t[x.currency === "USD" ? "usd" : "ars"] += x.amount;
  return { ars: round2(t.ars), usd: round2(t.usd) };
}

/** "$ 230.000 + US$ 45", como figura en un resumen; solo la moneda que tenga monto. */
export function formatTotals({ ars, usd }: CurrencyTotals): string {
  if (usd > 0 && ars === 0) return formatMoney(usd, "USD");
  return usd > 0 ? `${formatMoney(ars)} + ${formatMoney(usd, "USD")}` : formatMoney(ars);
}
