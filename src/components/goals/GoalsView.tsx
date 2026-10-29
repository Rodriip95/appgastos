import { ArrowDownLeft, ArrowUpRight, History, PiggyBank } from "lucide-react";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { CollapsibleList } from "@/components/common/CollapsibleList";
import {
  GoalCard,
  NewGoalButton,
  SuggestedGoals,
  UndoMovementButton,
} from "@/components/goals/GoalSheets";
import { formatDayLabel, formatMoney, formatMonthShort } from "@/lib/finance/format";
import { netSaved } from "@/lib/finance/goals";
import type { Goal, GoalMovement } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Props = {
  goals: Goal[];
  /** Últimos aportes y retiros de todas las metas */
  movements: GoalMovement[];
  today: string;
};

/** Página de ahorros y metas. Solo presentación: los datos llegan de `(app)/ahorros/page.tsx`. */
export function GoalsView({ goals, movements, today }: Props) {
  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0);
  const currentMonth = today.slice(0, 7);
  const thisMonth = netSaved(movements.filter((m) => m.month === currentMonth));
  const byId = new Map(goals.map((g) => [g.id, g]));
  // Las metas cumplidas van al final.
  const ordered = [...goals].sort((a, b) => Number(a.saved >= a.target) - Number(b.saved >= b.target));

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ahorros y metas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aparta dinero para lo que quieres lograr y mira cuánto te falta.
          </p>
        </div>
        {goals.length > 0 && <NewGoalButton />}
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-muted">
            <PiggyBank className="size-7 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Crea tu primera meta</h2>
          <p className="mt-1 mb-6 max-w-sm text-sm text-muted-foreground">
            Un fondo de emergencia, un viaje o un auto: define cuánto y para cuándo, y te decimos cuánto
            apartar cada mes.
          </p>
          <SuggestedGoals />
          <NewGoalButton variant="outline" className="mt-4 h-11" />
        </div>
      ) : (
        <>
          <section
            aria-label="Resumen de ahorros"
            className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/10"
          >
            <p className="text-sm text-primary-foreground/60">Total reservado</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{formatMoney(totalSaved)}</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${totalTarget ? Math.min((totalSaved / totalTarget) * 100, 100) : 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-primary-foreground/60">
              {Math.round(totalTarget ? (totalSaved / totalTarget) * 100 : 0)}% del total de tus metas (
              {formatMoney(totalTarget)})
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-primary-foreground/10 p-3">
                <p className="text-xs text-primary-foreground/70">En {formatMonthShort(currentMonth).toLowerCase()}</p>
                <p className="mt-1 truncate text-lg font-semibold tabular-nums">
                  {thisMonth >= 0 ? "+" : "−"}
                  {formatMoney(Math.abs(thisMonth))}
                </p>
              </div>
              <div className="rounded-2xl bg-primary-foreground/10 p-3">
                <p className="text-xs text-primary-foreground/70">Metas activas</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {goals.filter((g) => g.saved < g.target).length} de {goals.length}
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {ordered.map((goal) => (
              <GoalCard key={goal.id} goal={goal} today={today} />
            ))}
          </div>

          <section aria-label="Historial" className="rounded-3xl border bg-card p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <History className="size-4 text-muted-foreground" /> Historial
            </h2>
            {movements.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Todavía no hay aportes. Usa <strong className="font-medium text-foreground">Aportar</strong> en
                una meta.
              </p>
            ) : (
              <CollapsibleList limit={6} noun="movimientos" className="mt-2 divide-y">
                {movements.map((m) => {
                  const goal = byId.get(m.goalId);
                  const deposit = m.amount >= 0;
                  return (
                    <li key={m.id} className="flex items-center gap-3 py-2.5">
                      <span className="relative">
                        <CategoryIcon icon={goal?.icon} color={goal?.color} size="sm" />
                        <span
                          className={cn(
                            "absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border-2 border-card text-white",
                            deposit ? "bg-emerald-500" : "bg-rose-500",
                          )}
                        >
                          {deposit ? <ArrowDownLeft className="size-2.5" /> : <ArrowUpRight className="size-2.5" />}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.note || goal?.name || "Meta eliminada"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[formatDayLabel(m.date, today), m.note ? goal?.name : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          deposit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
                        )}
                      >
                        {deposit ? "+" : "−"}
                        {formatMoney(Math.abs(m.amount))}
                      </span>
                      <UndoMovementButton id={m.id} />
                    </li>
                  );
                })}
              </CollapsibleList>
            )}
          </section>
        </>
      )}
    </main>
  );
}
