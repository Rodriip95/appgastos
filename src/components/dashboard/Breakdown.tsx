import { ChevronDown, ChartPie } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_COLORS, CategoryIcon } from "@/components/categories/CategoryIcon";
import { formatMoney } from "@/lib/finance/format";
import type { BreakdownRow, MonthSummary } from "@/lib/finance/summary";
import { cn } from "@/lib/utils";

export function Breakdown({ summary }: { summary: MonthSummary }) {
  return (
    <section className="rounded-3xl border bg-card p-4 sm:p-5">
      <Tabs defaultValue="expense" className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">¿En qué se fue?</h2>
          <TabsList className="h-9">
            <TabsTrigger value="expense" className="px-3">Gastos</TabsTrigger>
            <TabsTrigger value="income" className="px-3">Ingresos</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="expense">
          <Rows rows={summary.breakdown.expense} empty="Sin gastos registrados este mes." />
        </TabsContent>
        <TabsContent value="income">
          <Rows rows={summary.breakdown.income} empty="Sin ingresos registrados este mes." />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Rows({ rows, empty }: { rows: BreakdownRow[]; empty: string }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <ChartPie className="size-6" />
        {empty}
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {rows.map((row) => {
        const color = row.category?.color ?? "slate";
        const showSubs = row.subs.length > 1 || (row.subs[0] && row.subs[0].key !== "none");
        return (
          <li key={row.key}>
            <details className="group">
              <summary
                className={cn(
                  "flex list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden",
                  showSubs ? "cursor-pointer" : "pointer-events-none",
                )}
              >
                <CategoryIcon icon={row.category?.icon} color={color} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {row.category?.name ?? "Sin categoría"}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatMoney(row.total)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", CATEGORY_COLORS[color].solid)}
                        style={{ width: `${Math.max(row.pct, 2)}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
                      {Math.round(row.pct)}%
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition group-open:rotate-180",
                    !showSubs && "invisible",
                  )}
                  aria-hidden
                />
              </summary>
              {showSubs && (
                <ul className="space-y-2 pb-3 pl-11 pr-7">
                  {row.subs.map((s) => (
                    <li key={s.key} className="flex justify-between gap-2 text-sm">
                      <span className="truncate text-muted-foreground">{s.name}</span>
                      <span className="tabular-nums">{formatMoney(s.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </li>
        );
      })}
    </ul>
  );
}
