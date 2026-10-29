import Link from "next/link";
import { ChartPie, ChevronDown, ListFilter, TrendingDown, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollapsibleList } from "@/components/common/CollapsibleList";
import { CATEGORY_COLORS, CategoryIcon } from "@/components/categories/CategoryIcon";
import type { ColorKey } from "@/lib/finance/catalog";
import { formatMoney } from "@/lib/finance/format";
import { changePct, type BreakdownRow, type MonthSummary } from "@/lib/finance/summary";
import type { TxType } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

// Trazo del gráfico (SVG usa currentColor); clases literales para Tailwind.
const STROKE: Record<ColorKey, string> = {
  slate: "text-slate-400",
  red: "text-red-500",
  orange: "text-orange-500",
  amber: "text-amber-500",
  lime: "text-lime-500",
  emerald: "text-emerald-500",
  teal: "text-teal-500",
  sky: "text-sky-500",
  blue: "text-blue-500",
  indigo: "text-indigo-500",
  violet: "text-violet-500",
  pink: "text-pink-500",
};

type Props = {
  summary: MonthSummary;
  /** Arma el link que filtra la lista de movimientos por categoría */
  filterHref: (categoryKey: string) => string;
};

export function Breakdown({ summary, filterHref }: Props) {
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
        {(["expense", "income"] as const).map((type) => (
          <TabsContent key={type} value={type}>
            <Rows
              rows={summary.breakdown[type]}
              total={type === "income" ? summary.income : summary.expense}
              type={type}
              filterHref={filterHref}
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function Donut({ rows, total, type }: { rows: BreakdownRow[]; total: number; type: TxType }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  // Cada segmento empieza donde terminó el anterior.
  const segments = rows.map((row, i) => ({
    row,
    length: (row.pct / 100) * circumference,
    start: rows.slice(0, i).reduce((sum, prev) => sum + (prev.pct / 100) * circumference, 0),
  }));

  return (
    <div className="relative mx-auto size-44">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" className="stroke-muted" />
        {segments.map(({ row, length, start }) => {
          // Un pequeño hueco entre segmentos los separa visualmente.
          const gap = rows.length > 1 ? Math.min(1.5, length / 2) : 0;
          return (
            <circle
              key={row.key}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeDasharray={`${Math.max(length - gap, 0)} ${circumference}`}
              strokeDashoffset={-start}
              className={STROKE[row.category?.color ?? "slate"]}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-xs text-muted-foreground">{type === "income" ? "Ingresos" : "Gastos"}</span>
        <span className="text-lg font-semibold tabular-nums">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

function Rows({
  rows,
  total,
  type,
  filterHref,
}: {
  rows: BreakdownRow[];
  total: number;
  type: TxType;
  filterHref: Props["filterHref"];
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <ChartPie className="size-6" />
        Sin {type === "income" ? "ingresos" : "gastos"} registrados este mes.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Donut rows={rows} total={total} type={type} />
      <CollapsibleList
        limit={5}
        className="divide-y"
        noun="categorías"
      >
        {rows.map((row) => {
          const color = row.category?.color ?? "slate";
          const change = changePct(row.total, row.prevTotal);
          // En gastos, subir es malo; en ingresos, bueno.
          const good = change !== null && (type === "income" ? change >= 0 : change <= 0);
          return (
            <li key={row.key}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
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
                    className="size-4 text-muted-foreground transition group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="space-y-2 pr-7 pb-3 pl-11">
                  {change !== null && (
                    <p
                      className={cn(
                        "flex items-center gap-1 text-xs",
                        good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {change > 0 ? "+" : ""}
                      {change}% vs el mes anterior ({formatMoney(row.prevTotal)})
                    </p>
                  )}
                  {(row.subs.length > 1 || row.subs[0]?.key !== "none") && (
                    <ul className="space-y-1.5">
                      {row.subs.map((s) => (
                        <li key={s.key} className="flex justify-between gap-2 text-sm">
                          <span className="truncate text-muted-foreground">{s.name}</span>
                          <span className="tabular-nums">{formatMoney(s.total)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={filterHref(row.key)}
                    scroll={false}
                    className="inline-flex items-center gap-1.5 text-xs font-medium underline-offset-4 hover:underline"
                  >
                    <ListFilter className="size-3.5" /> Ver sus movimientos
                  </Link>
                </div>
              </details>
            </li>
          );
        })}
      </CollapsibleList>
    </div>
  );
}
