import { shiftMonth } from "@/lib/finance/format";

/** Cómo se mira el balance de la home: un mes, un período elegido o todo el historial. */
export type BalanceView =
  | { kind: "month" }
  | { kind: "general" }
  | { kind: "period"; from: string; to: string };

/** Cookie (por dispositivo) con la última vista elegida. */
export const BALANCE_VIEW_COOKIE = "balanceView";

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const isDateKey = (v: unknown): v is string => typeof v === "string" && DATE_RE.test(v);

/** Período por defecto: el mes en curso y los dos anteriores. */
export const defaultPeriod = (today: string) => ({
  from: `${shiftMonth(today.slice(0, 7), -2)}-01`,
  to: today,
});

function periodView(from: unknown, to: unknown, today: string): BalanceView {
  if (!isDateKey(from) || !isDateKey(to)) return { kind: "period", ...defaultPeriod(today) };
  return from <= to ? { kind: "period", from, to } : { kind: "period", from: to, to: from };
}

/** Parámetros de la URL de cada vista, sin `?`. */
export function balanceViewQuery(view: BalanceView): string {
  if (view.kind === "general") return "v=general";
  if (view.kind === "period") return `v=periodo&d=${view.from}&h=${view.to}`;
  return "v=mes";
}

/**
 * Vista a mostrar: lo que pide la URL o, si no pide nada, la última elegida.
 * Un `?m=` siempre es la vista mensual (enlaces al mes de un movimiento).
 */
export function resolveBalanceView(
  params: { m?: unknown; v?: unknown; d?: unknown; h?: unknown },
  saved: string | undefined,
  today: string,
): BalanceView {
  if (params.m) return { kind: "month" };
  const source = params.v ? params : Object.fromEntries(new URLSearchParams(saved));
  if (source.v === "general") return { kind: "general" };
  if (source.v === "periodo") return periodView(source.d, source.h, today);
  return { kind: "month" };
}
