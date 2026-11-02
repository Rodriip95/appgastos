import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, DollarSign, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { rateLabel, type UsdRate } from "@/lib/finance/currency";
import { formatMoney, formatMonthShort } from "@/lib/finance/format";
import { changePct, type MonthSummary } from "@/lib/finance/summary";
import { cn } from "@/lib/utils";

type Props = {
  /** Título de la tarjeta (cambia en las vistas general y de período) */
  label?: string;
  summary: MonthSummary;
  /** Totales del mes anterior, para comparar */
  previous?: { income: number; expense: number; month: string };
  /** Gasto proyectado a fin de mes (solo mes en curso) */
  projection?: number | null;
  /** Neto apartado para metas en lo que se ve (aportes − retiros) */
  saved?: number;
  /** Cotización de hoy, para la referencia del total en pesos */
  usdRate?: UsdRate | null;
  /** Botón para registrar un ingreso (va en el total de ingresos) */
  incomeAction?: ReactNode;
  /** Botón para registrar un gasto (va en el total de gastos) */
  expenseAction?: ReactNode;
};

/** Id de la fila de totales: el + flotante aparece cuando sale de pantalla. */
export const BALANCE_ACTIONS_ID = "balance-actions";

export function BalanceCard({
  label = "Balance del mes",
  summary,
  previous,
  projection,
  saved = 0,
  usdRate,
  incomeAction,
  expenseAction,
}: Props) {
  // Los totales grandes son los pesos; los dólares van aparte (no se mezclan monedas).
  // El porcentaje gastado sí usa todo junto en pesos, porque es una proporción.
  const { income, expense, balance } = summary.ars;
  const usd = summary.usd;
  const spentPct = summary.income > 0 ? Math.round((summary.expense / summary.income) * 100) : null;
  const prevLabel = previous ? formatMonthShort(previous.month).toLowerCase() : "";

  return (
    <section
      aria-label={label}
      className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/10"
    >
      <p className="text-sm text-primary-foreground/60">{label}</p>
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
            {projection ? ` · Al ritmo actual cerrarías en ${usd ? "≈ " : ""}${formatMoney(projection)}` : ""}
          </p>
        </div>
      )}

      {saved !== 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-primary-foreground/10 px-3 py-2 text-xs text-primary-foreground/80">
          <PiggyBank className="size-4 shrink-0" />
          <span>
            {saved > 0 ? "Apartaste" : "Retiraste"}{" "}
            <strong className="font-semibold text-primary-foreground tabular-nums">
              {formatMoney(Math.abs(saved))}
            </strong>{" "}
            {saved > 0 ? "para tus metas" : "de tus metas"} · Libre:{" "}
            <strong className="font-semibold text-primary-foreground tabular-nums">
              {formatMoney(balance - saved)}
            </strong>
          </span>
        </p>
      )}

      {usd && (
        <div className="mt-3 rounded-2xl bg-primary-foreground/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs text-primary-foreground/70">
              <span className="grid size-6 place-items-center rounded-full bg-primary-foreground/15">
                <DollarSign className="size-3.5" />
              </span>
              En dólares
            </p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                usd.balance < 0 && "text-rose-300 dark:text-rose-600",
              )}
            >
              {formatMoney(usd.balance, "USD")}
            </p>
          </div>
          <p className="mt-1 text-xs text-primary-foreground/70 tabular-nums">
            Ingresos {formatMoney(usd.income, "USD")} · Gastos {formatMoney(usd.expense, "USD")}
          </p>
          <p className="mt-2 border-t border-primary-foreground/15 pt-2 text-xs text-primary-foreground/70">
            Todo en pesos ≈{" "}
            <strong className="font-semibold text-primary-foreground tabular-nums">
              {formatMoney(Math.round(summary.balance))}
            </strong>
            {usdRate && ` · Hoy ${rateLabel(usdRate.kind)} ${formatMoney(Math.round(usdRate.rate))}`}
          </p>
        </div>
      )}

      <div id={BALANCE_ACTIONS_ID} className="mt-5 grid grid-cols-2 gap-3">
        <Stat
          label="Ingresos"
          value={income}
          tone="income"
          change={previous ? changePct(income, previous.income) : null}
          prevLabel={prevLabel}
          action={incomeAction}
        />
        <Stat
          label="Gastos"
          value={expense}
          tone="expense"
          change={previous ? changePct(expense, previous.expense) : null}
          prevLabel={prevLabel}
          action={expenseAction}
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  change,
  prevLabel,
  action,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
  change: number | null;
  prevLabel: string;
  action?: ReactNode;
}) {
  const Icon = tone === "income" ? ArrowDownLeft : ArrowUpRight;
  // Más ingreso es bueno; más gasto, no.
  const good = change !== null && (tone === "income" ? change >= 0 : change <= 0);
  const Trend = change !== null && change >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl bg-primary-foreground/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 pt-1.5 text-xs text-primary-foreground/70">
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full",
              tone === "income"
                ? "bg-emerald-400/20 text-emerald-300 dark:text-emerald-700"
                : "bg-rose-400/20 text-rose-300 dark:text-rose-700",
            )}
          >
            <Icon className="size-3.5" />
          </span>
          {label}
        </div>
        {action}
      </div>
      <p className="mt-1.5 truncate text-lg font-semibold tabular-nums">{formatMoney(value)}</p>
      {change !== null && (
        <p
          className={cn(
            "mt-0.5 flex items-center gap-1 text-[11px]",
            good ? "text-emerald-300 dark:text-emerald-700" : "text-rose-300 dark:text-rose-700",
          )}
        >
          <Trend className="size-3" />
          {change > 0 ? "+" : ""}
          {change}% vs {prevLabel}
        </p>
      )}
    </div>
  );
}
