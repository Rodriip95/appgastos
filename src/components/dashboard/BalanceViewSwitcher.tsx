"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  BALANCE_VIEW_COOKIE,
  balanceViewQuery,
  defaultPeriod,
  type BalanceView,
} from "@/lib/finance/balance-view";
import { shiftMonth } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

/** Recuerda la vista en este dispositivo: la home abre siempre en la última elegida. */
function remember(view: BalanceView) {
  const value = encodeURIComponent(balanceViewQuery(view));
  document.cookie = `${BALANCE_VIEW_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Mes / Período / General. En la home (`basePath` "/") la elección se recuerda; en otras
 * páginas (Mi negocio) solo cambia la URL.
 */
export function BalanceViewSwitcher({
  view,
  today,
  basePath = "/",
}: {
  view: BalanceView;
  today: string;
  basePath?: string;
}) {
  const period: BalanceView =
    view.kind === "period" ? view : { kind: "period", ...defaultPeriod(today) };
  const tabs: { label: string; target: BalanceView }[] = [
    { label: "Mes", target: { kind: "month" } },
    { label: "Período", target: period },
    { label: "General", target: { kind: "general" } },
  ];

  return (
    <nav aria-label="Ver balance por" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
      {tabs.map(({ label, target }) => {
        const active = target.kind === view.kind;
        return (
          <Link
            key={label}
            href={`${basePath}?${balanceViewQuery(target)}`}
            scroll={false}
            onClick={() => basePath === "/" && remember(target)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full py-1.5 text-center text-sm font-medium transition",
              active ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desde/hasta del período, con atajos para los rangos más comunes. */
export function PeriodPicker({
  from,
  to,
  today,
  basePath = "/",
}: {
  from: string;
  to: string;
  today: string;
  basePath?: string;
}) {
  const router = useRouter();
  const currentMonth = today.slice(0, 7);

  function go(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo) return;
    const view: BalanceView = { kind: "period", from: nextFrom, to: nextTo };
    if (basePath === "/") remember(view);
    router.replace(`${basePath}?${balanceViewQuery(view)}`, { scroll: false });
  }

  const presets = [
    { label: "3 meses", from: `${shiftMonth(currentMonth, -2)}-01` },
    { label: "6 meses", from: `${shiftMonth(currentMonth, -5)}-01` },
    { label: "Este año", from: `${today.slice(0, 4)}-01-01` },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          Desde
          <Input type="date" value={from} max={to} onChange={(e) => go(e.target.value, to)} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Hasta
          <Input type="date" value={to} min={from} onChange={(e) => go(from, e.target.value)} />
        </label>
      </div>
      <div className="flex justify-center gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => go(p.from, today)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition hover:bg-muted",
              p.from === from && to === today && "bg-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
