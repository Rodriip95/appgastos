import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CATEGORY_COLORS, CategoryIcon } from "@/components/categories/CategoryIcon";
import { formatMoney } from "@/lib/finance/format";
import { goalPct } from "@/lib/finance/goals";
import type { Goal } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const MAX_GOALS = 3;

/** Metas en la home: las activas más avanzadas, con link a /ahorros. */
export function GoalsStrip({ goals, href }: { goals: Goal[]; href: string }) {
  if (goals.length === 0) return null;
  const active = goals
    .filter((g) => g.saved < g.target)
    .sort((a, b) => goalPct(b) - goalPct(a))
    .slice(0, MAX_GOALS);
  const total = goals.reduce((sum, g) => sum + g.saved, 0);

  return (
    <section aria-label="Metas de ahorro" className="rounded-3xl border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Metas</h2>
          <p className="text-xs text-muted-foreground tabular-nums">{formatMoney(total)} reservados en total</p>
        </div>
        <Link
          href={href}
          className="flex items-center gap-0.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Ver todas <ChevronRight className="size-4" />
        </Link>
      </div>
      {active.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">¡Cumpliste todas tus metas! Crea una nueva.</p>
      ) : (
        <ul className="mt-3 space-y-3.5">
          {active.map((g) => {
            const pct = goalPct(g);
            return (
              <li key={g.id}>
                <Link href={href} className="flex items-center gap-3">
                  <CategoryIcon icon={g.icon} color={g.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{g.name}</span>
                      <span className="shrink-0 text-xs font-medium tabular-nums">{Math.floor(pct)}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", CATEGORY_COLORS[g.color].solid)}
                        style={{ width: `${Math.max(pct, 1.5)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {formatMoney(g.saved)} de {formatMoney(g.target)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
