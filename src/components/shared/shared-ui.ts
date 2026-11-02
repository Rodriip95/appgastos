import { formatMoney } from "@/lib/finance/format";
import { fromCents } from "@/lib/finance/shared";
import type { Currency, SharedMember } from "@/lib/finance/types";

/** Color de cada participante en barras y puntos (según su orden en el espacio). */
export const PERSON_TONES = [
  { dot: "bg-primary", text: "text-primary" },
  { dot: "bg-brand-orange", text: "text-brand-orange" },
  { dot: "bg-sky-500", text: "text-sky-500" },
  { dot: "bg-violet-500", text: "text-violet-500" },
] as const;

export const toneAt = (index: number) => PERSON_TONES[index % PERSON_TONES.length];

/** Monto en centavos en la moneda del espacio. */
export const money = (cents: number, currency: Currency = "ARS") => formatMoney(fromCents(cents), currency);

/** "+$ 1.500" / "−US$ 20"; cero sin signo. */
export function signedMoney(cents: number, currency: Currency = "ARS") {
  if (cents === 0) return money(0, currency);
  return `${cents > 0 ? "+" : "−"}${money(Math.abs(cents), currency)}`;
}

export const firstName = (m: Pick<SharedMember, "name" | "email">) =>
  (m.name || m.email).split(" ")[0];

/** Quienes participan hoy (los que se fueron solo figuran en el historial). */
export const activeMembers = (members: SharedMember[]) => members.filter((m) => m.status === "accepted");
