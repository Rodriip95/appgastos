import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/finance/format";
import type { MonthSummary } from "@/lib/finance/summary";
import { cn } from "@/lib/utils";

export function BalanceCard({ summary, actions }: { summary: MonthSummary; actions?: ReactNode }) {
  const { income, expense, balance } = summary;
  const spentPct = income > 0 ? Math.round((expense / income) * 100) : null;

  return (
    <section
      aria-label="Balance del mes"
      className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/10"
    >
      <p className="text-sm text-primary-foreground/60">Balance del mes</p>
      <p
        className={cn(
          "mt-1 text-4xl font-semibold tracking-tight tabular-nums",
          balance < 0 && "text-rose-300 dark:text-rose-600",
        )}
      >
        {formatMoney(balance)}
      </p>

      {spentPct !== null && (
        <div className="mt-4 space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
            <div
              className={cn("h-full rounded-full", spentPct > 100 ? "bg-rose-400" : "bg-emerald-400")}
              style={{ width: `${Math.min(spentPct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-primary-foreground/60">
            {spentPct > 100
              ? `Gastaste ${spentPct - 100}% más de lo que ingresó`
              : `Gastaste el ${spentPct}% de tus ingresos`}
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Ingresos" value={income} tone="income" />
        <Stat label="Gastos" value={expense} tone="expense" />
      </div>

      {actions && <div className="mt-4 border-t border-primary-foreground/10 pt-4">{actions}</div>}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "income" | "expense" }) {
  const Icon = tone === "income" ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="rounded-2xl bg-primary-foreground/10 p-3">
      <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full",
            tone === "income" ? "bg-emerald-400/20 text-emerald-300 dark:text-emerald-700" : "bg-rose-400/20 text-rose-300 dark:text-rose-700",
          )}
        >
          <Icon className="size-3.5" />
        </span>
        {label}
      </div>
      <p className="mt-1.5 truncate text-lg font-semibold tabular-nums">{formatMoney(value)}</p>
    </div>
  );
}
