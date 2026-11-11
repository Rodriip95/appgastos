import "server-only";
import { io } from "next/cache";
import { getBusinessData } from "@/lib/data/business";
import { balanceViewQuery, resolveBalanceView } from "@/lib/finance/balance-view";
import type { DateRange } from "@/lib/finance/business";
import { isMonthKey, todayKey } from "@/lib/finance/format";

type Params = Record<string, string | string[] | undefined>;

/**
 * Datos de cualquier pantalla de Mi negocio (`/negocio` y `/negocio/<sección>`), con la vista
 * de balance que pide la URL. Misma lógica que la home, pero sin recordar la elección.
 */
export async function loadBusiness(searchParams: Promise<Params>) {
  const data = await getBusinessData();
  const params = await searchParams;
  await io(); // "hoy" se calcula en cada request
  const today = todayKey();
  const currentMonth = today.slice(0, 7);

  const view = resolveBalanceView(params, undefined, today);
  const month = isMonthKey(params.m) && params.m <= currentMonth ? params.m : currentMonth;
  const range: DateRange =
    view.kind === "month"
      ? { from: `${month}-01`, to: `${month}-31` }
      : view.kind === "period"
        ? { from: view.from, to: view.to }
        : { from: null, to: today };
  // Para que la vista elegida viaje entre la pantalla principal y las secciones.
  const query = view.kind === "month" ? (month === currentMonth ? "" : `m=${month}`) : balanceViewQuery(view);

  return { data, params, today, month, view, range, query };
}

export type BusinessPageData = Omit<Awaited<ReturnType<typeof loadBusiness>>, "params">;
