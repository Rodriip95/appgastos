import Link from "next/link";
import { Target } from "lucide-react";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { CollapsibleList } from "@/components/common/CollapsibleList";
import { formatMoney } from "@/lib/finance/format";
import type { MonthSummary } from "@/lib/finance/summary";
import type { Category } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

/** Avance de cada categoría con presupuesto: ámbar desde el 80%, rojo al pasarse. */
export function BudgetsCard({
  categories,
  summary,
  editHref = "/categorias",
}: {
  categories: Category[];
  summary: MonthSummary;
  editHref?: string;
}) {
  const budgeted = categories.filter((c) => c.type === "expense" && c.budget);
  if (budgeted.length === 0) return null;

  const spentBy = new Map(summary.breakdown.expense.map((r) => [r.key, r.total]));
  const items = budgeted
    .map((c) => {
      const spent = spentBy.get(c.id) ?? 0;
      return { category: c, spent, pct: (spent / c.budget!) * 100 };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <section aria-label="Presupuestos" className="rounded-3xl border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Target className="size-4 text-muted-foreground" /> Presupuestos
        </h2>
        <Link href={editHref} className="text-xs text-muted-foreground hover:text-foreground">
          Editar
        </Link>
      </div>
      <CollapsibleList limit={4} className="mt-3 space-y-3.5" noun="presupuestos">
        {items.map(({ category, spent, pct }) => {
          const over = pct > 100;
          const warn = pct >= 80;
          return (
            <li key={category.id} className="flex items-center gap-3">
              <CategoryIcon icon={category.icon} color={category.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{category.name}</span>
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums",
                      over
                        ? "font-semibold text-rose-600 dark:text-rose-400"
                        : warn
                          ? "font-medium text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {formatMoney(spent)} / {formatMoney(category.budget!)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      over ? "bg-rose-500" : warn ? "bg-amber-500" : "bg-emerald-500",
                    )}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                {over && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    Te pasaste {formatMoney(spent - category.budget!)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </CollapsibleList>
    </section>
  );
}
