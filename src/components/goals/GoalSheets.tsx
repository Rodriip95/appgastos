"use client";

import { useState, useTransition } from "react";
import { Loader2, Minus, Pencil, Plus, Trophy, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import { CATEGORY_COLORS, CategoryIcon } from "@/components/categories/CategoryIcon";
import { GoalForm, GoalMovementForm } from "@/components/goals/GoalForms";
import { deleteGoalMovement } from "@/lib/actions/goals";
import { formatMoney, formatMonth } from "@/lib/finance/format";
import { goalPct, goalPlan, SUGGESTED_GOALS } from "@/lib/finance/goals";
import type { Goal } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type SheetMode = { kind: "edit" } | { kind: "move"; move: "deposit" | "withdraw" } | null;

/** Tarjeta de una meta: avance, cuánto apartar por mes y botones Aportar / Retirar. */
export function GoalCard({ goal, today, demo = false }: { goal: Goal; today: string; demo?: boolean }) {
  const [mode, setMode] = useState<SheetMode>(null);
  const pct = goalPct(goal);
  const plan = goalPlan(goal, today);
  const done = plan.kind === "done";

  return (
    <section className="space-y-4 rounded-3xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <CategoryIcon icon={goal.icon} color={goal.color} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{goal.name}</h3>
          <p className="text-xs text-muted-foreground">
            {goal.targetDate ? `Para ${formatMonth(goal.targetDate.slice(0, 7)).toLowerCase()}` : "Sin fecha límite"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode({ kind: "edit" })}
          aria-label={`Editar ${goal.name}`}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatMoney(goal.saved)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            de {formatMoney(goal.target)} · <span className="font-medium text-foreground">{Math.floor(pct)}%</span>
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", CATEGORY_COLORS[goal.color].solid)}
            style={{ width: `${Math.max(pct, 1.5)}%` }}
          />
        </div>
        <p
          className={cn(
            "text-xs",
            done ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
          )}
        >
          {done && <Trophy className="mr-1 inline size-3.5 align-[-2px]" />}
          {plan.kind === "done" && "¡Meta cumplida!"}
          {plan.kind === "no-date" && `Te faltan ${formatMoney(goal.target - goal.saved)}`}
          {plan.kind === "overdue" &&
            `La fecha ya pasó y faltan ${formatMoney(plan.remaining)}. Puedes ajustar la meta.`}
          {plan.kind === "monthly" && (
            <>
              Aparta <strong className="font-semibold text-foreground">{formatMoney(plan.perMonth)}</strong> por mes
              para llegar a tiempo ({plan.months} {plan.months === 1 ? "mes" : "meses"})
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button className="h-10" onClick={() => setMode({ kind: "move", move: "deposit" })}>
          <Plus /> Aportar
        </Button>
        <Button
          variant="outline"
          className="h-10"
          disabled={goal.saved <= 0}
          onClick={() => setMode({ kind: "move", move: "withdraw" })}
        >
          <Minus /> Retirar
        </Button>
      </div>

      <ResponsiveSheet
        open={mode !== null}
        onOpenChange={(open) => !open && setMode(null)}
        title={mode?.kind === "edit" ? "Editar meta" : mode?.move === "withdraw" ? "Retirar de la meta" : "Aportar a la meta"}
      >
        {mode?.kind === "edit" && <GoalForm goal={goal} demo={demo} onDone={() => setMode(null)} />}
        {mode?.kind === "move" && (
          <GoalMovementForm goal={goal} kind={mode.move} demo={demo} onDone={() => setMode(null)} />
        )}
      </ResponsiveSheet>
    </section>
  );
}

/** Botón "Nueva meta"; con `preset` crea a partir de una sugerencia. */
export function NewGoalButton({
  demo = false,
  className,
  variant = "default",
}: {
  demo?: boolean;
  className?: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} className={cn("h-10", className)}>
        <Plus /> Nueva meta
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Nueva meta"
        description="Ponle un monto y, si quieres, una fecha: te decimos cuánto apartar por mes."
      >
        <GoalForm demo={demo} onDone={() => setOpen(false)} />
      </ResponsiveSheet>
    </>
  );
}

/** Sugerencias para crear la primera meta con un toque. */
export function SuggestedGoals({ demo = false }: { demo?: boolean }) {
  const [preset, setPreset] = useState<(typeof SUGGESTED_GOALS)[number] | null>(null);
  return (
    <>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_GOALS.map((g) => (
          <button
            key={g.name}
            type="button"
            onClick={() => setPreset(g)}
            className="flex h-10 items-center gap-2 rounded-full border bg-card pr-4 pl-1.5 text-sm transition hover:bg-muted"
          >
            <CategoryIcon icon={g.icon} color={g.color} size="sm" className="size-7 rounded-full" />
            {g.name}
          </button>
        ))}
      </div>
      <ResponsiveSheet open={preset !== null} onOpenChange={(o) => !o && setPreset(null)} title="Nueva meta">
        {preset && <GoalForm key={preset.name} preset={preset} demo={demo} onDone={() => setPreset(null)} />}
      </ResponsiveSheet>
    </>
  );
}

/** Deshacer un aporte o retiro del historial. */
export function UndoMovementButton({ id, demo = false }: { id: string; demo?: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label="Deshacer movimiento"
      disabled={pending}
      onClick={() => {
        if (demo) {
          toast.info("Modo demo: los cambios no se guardan");
          return;
        }
        startTransition(async () => {
          const res = await deleteGoalMovement(id);
          if (res.ok) toast.success("Movimiento deshecho");
          else toast.error(res.error);
        });
      }}
      className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
    </button>
  );
}

