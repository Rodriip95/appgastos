import { APP_CURRENCY, APP_LOCALE, APP_TIME_ZONE } from "@/lib/config";

const moneyInt = new Intl.NumberFormat(APP_LOCALE, {
  style: "currency",
  currency: APP_CURRENCY,
  maximumFractionDigits: 0,
});
const moneyDec = new Intl.NumberFormat(APP_LOCALE, {
  style: "currency",
  currency: APP_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number): string {
  return Number.isInteger(value) ? moneyInt.format(value) : moneyDec.format(value);
}

/**
 * Interpreta lo que el usuario escribe como monto: "1.234,5", "1234.50", "1234".
 * Devuelve null si no es un número positivo.
 */
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  else if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(".", ""); // "1.500" = mil quinientos
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const utcDate = (ymd: string) => {
  const [y, m, d = 1] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** "2026-10" → "Octubre 2026" */
export function formatMonth(month: string): string {
  const name = new Intl.DateTimeFormat(APP_LOCALE, { month: "long", timeZone: "UTC" }).format(
    utcDate(month),
  );
  return `${capitalize(name)} ${month.slice(0, 4)}`;
}

/** "2026-10" → "Octubre" */
export function formatMonthShort(month: string): string {
  return capitalize(
    new Intl.DateTimeFormat(APP_LOCALE, { month: "long", timeZone: "UTC" }).format(utcDate(month)),
  );
}

/** Etiqueta de día para agrupar movimientos: "Hoy", "Ayer", "Lun 27 oct" */
export function formatDayLabel(date: string, today: string): string {
  if (date === today) return "Hoy";
  if (date === shiftDay(today, -1)) return "Ayer";
  return capitalize(formatShortDate(date));
}

/** "2026-11-03" → "lun 3 nov" */
export function formatShortDate(date: string): string {
  const label = new Intl.DateTimeFormat(APP_LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(utcDate(date));
  return label.replace(/[,.]/g, "");
}

// ---- Fechas como strings (sin problemas de zona horaria) ----

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isMonthKey = (v: unknown): v is string => typeof v === "string" && MONTH_RE.test(v);

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de la app. */
export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function shiftDay(date: string, delta: number): string {
  const d = utcDate(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Último día del mes: "2026-02" → "2026-02-28" */
export function lastDayOfMonth(month: string): string {
  return shiftDay(`${shiftMonth(month, 1)}-01`, -1);
}
