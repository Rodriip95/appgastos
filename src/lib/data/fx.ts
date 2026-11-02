import "server-only";
import { cacheLife } from "next/cache";
import { USD_REFERENCE, USD_REFERENCE_OPTIONS } from "@/lib/config";
import { verifySession } from "@/lib/auth/session";
import { profilesCollection } from "@/lib/data/collections";
import type { UsdRate } from "@/lib/finance/currency";
import { todayKey } from "@/lib/finance/format";

// Cotización del dólar en Argentina con APIs gratuitas y sin clave:
// - Hoy: https://dolarapi.com/v1/dolares/{casa} → { compra, venta, casa, fechaActualizacion }
// - Fecha pasada: https://api.argentinadatos.com/v1/cotizaciones/dolares/{casa}/{YYYY/MM/DD}
// Se usa el precio de venta (lo que cuesta comprar un dólar). Las respuestas se cachean
// en el servidor; si la API falla, se devuelve null y el movimiento se guarda igual.

const KINDS = ["oficial", "blue", "bolsa", "contadoconliqui", "tarjeta", "mayorista", "cripto"] as const;
type Kind = (typeof KINDS)[number];

const TIMEOUT_MS = 4000;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  return res.json();
}

const validRate = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Cotización actual (cacheada 1 hora). Lanza si la API falla, para no cachear el error. */
async function fetchCurrent(kind: Kind): Promise<UsdRate> {
  "use cache";
  cacheLife("hours");
  const data = (await getJson(`https://dolarapi.com/v1/dolares/${kind}`)) as {
    venta?: unknown;
    fechaActualizacion?: string;
  };
  const rate = validRate(data.venta);
  if (!rate) throw new Error(`dolarapi sin precio de venta para ${kind}`);
  const date = typeof data.fechaActualizacion === "string" ? todayKey(new Date(data.fechaActualizacion)) : todayKey();
  return { kind, rate, date };
}

/** Cotización de una fecha pasada (no cambia: se cachea al máximo). */
async function fetchOn(kind: Kind, date: string): Promise<UsdRate> {
  "use cache";
  cacheLife("max");
  const data = await getJson(
    `https://api.argentinadatos.com/v1/cotizaciones/dolares/${kind}/${date.replaceAll("-", "/")}`,
  );
  // La documentación muestra un objeto, pero puede venir como lista.
  const row = (Array.isArray(data) ? data[0] : data) as { venta?: unknown } | undefined;
  const rate = validRate(row?.venta);
  if (!rate) throw new Error(`argentinadatos sin cotización ${kind} para ${date}`);
  return { kind, rate, date };
}

export type UsdReference = (typeof USD_REFERENCE_OPTIONS)[number];

export const isUsdReference = (v: unknown): v is UsdReference =>
  typeof v === "string" && (USD_REFERENCE_OPTIONS as readonly string[]).includes(v);

/** Dólar de referencia que eligió la persona (en su perfil, `usdReference`); oficial si no eligió. */
export async function getUsdReference(): Promise<UsdReference> {
  const { uid } = await verifySession();
  try {
    const value = (await profilesCollection().doc(uid).get()).get("usdReference");
    return isUsdReference(value) ? value : (USD_REFERENCE as UsdReference);
  } catch {
    return USD_REFERENCE as UsdReference;
  }
}

/** Cotización actual del dólar `kind`; null si la API no responde. */
export async function getUsdRate(kind: string = USD_REFERENCE): Promise<UsdRate | null> {
  if (!(KINDS as readonly string[]).includes(kind)) return null;
  try {
    return await fetchCurrent(kind as Kind);
  } catch (error) {
    console.error("[fx] cotización actual:", error);
    return null;
  }
}

/**
 * Cotización para un movimiento fechado en `date`: la de ese día si es pasado (con la
 * actual como respaldo, por fines de semana y feriados), o la actual si es hoy o futuro.
 * `today` se pasa desde quien llama (en el servidor hay que llamar `io()` antes de calcularlo).
 */
export async function getUsdRateFor(date: string, today: string, kind: string = USD_REFERENCE): Promise<UsdRate | null> {
  if (date < today && (KINDS as readonly string[]).includes(kind) && kind !== "tarjeta") {
    try {
      return await fetchOn(kind as Kind, date);
    } catch {
      // Sin dato para ese día: se usa la cotización actual.
    }
  }
  return getUsdRate(kind);
}
