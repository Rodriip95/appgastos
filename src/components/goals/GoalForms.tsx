"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CategoryIcon,
} from "@/components/categories/CategoryIcon";
import { addGoalMovement, deleteGoal, saveGoal } from "@/lib/actions/goals";
import { COLOR_KEYS, type ColorKey, type IconKey } from "@/lib/finance/catalog";
import { formatAmountInput, formatMoney, parseAmount, todayKey } from "@/lib/finance/format";
import type { Goal } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

/** Íconos que tienen sentido para una meta (subconjunto del catálogo). */
const GOAL_ICONS: IconKey[] = [
  "piggy-bank",
  "plane",
  "car",
  "house",
  "graduation-cap",
  "laptop",
  "smartphone",
  "gift",
  "baby",
  "heart-pulse",
  "landmark",
  "wallet",
];

const amountText = (n: number) => formatAmountInput(String(n).replace(".", ","));

type GoalFormProps = {
  goal?: Goal;
  /** Valores iniciales al crear desde una sugerencia */
  preset?: Pick<Goal, "name" | "icon" | "color">;
  onDone: () => void;
};

export function GoalForm({ goal, preset, onDone }: GoalFormProps) {
  const initial = goal ?? preset;
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(goal ? amountText(goal.target) : "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [icon, setIcon] = useState<IconKey>(initial?.icon ?? "piggy-bank");
  const [color, setColor] = useState<ColorKey>(initial?.color ?? "emerald");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseAmount(target);
    if (!amount) {
      toast.error("Ingresa el monto que quieres juntar");
      return;
    }
    startTransition(async () => {
      const res = await saveGoal({ name, target: amount, targetDate: targetDate || null, icon, color }, goal?.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(goal ? "Meta actualizada" : "Meta creada");
      onDone();
    });
  }

  function handleDelete() {
    if (!goal) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteGoal(goal.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Meta eliminada");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size="lg" />
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="goal-name">Nombre</Label>
          <Input
            id="goal-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Vacaciones en Bariloche"
            maxLength={40}
            autoComplete="off"
            className="h-11 text-base"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="goal-target">¿Cuánto quieres juntar?</Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="goal-target"
              inputMode="decimal"
              autoComplete="off"
              value={target}
              onChange={(e) => setTarget(formatAmountInput(e.target.value))}
              placeholder="0"
              className="h-11 pl-7 text-base tabular-nums"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-date">
            ¿Para cuándo? <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="goal-date"
            type="date"
            value={targetDate}
            min={todayKey()}
            onChange={(e) => setTargetDate(e.target.value)}
            className="h-11 text-base"
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ícono</legend>
        <div className="grid grid-cols-6 gap-2">
          {GOAL_ICONS.map((key) => {
            const Icon = CATEGORY_ICONS[key];
            const selected = key === icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                aria-label={key}
                aria-pressed={selected}
                className={cn(
                  "grid aspect-square place-items-center rounded-xl border transition",
                  selected
                    ? cn("border-transparent ring-2 ring-foreground", CATEGORY_COLORS[color].soft)
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-5" />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2.5">
          {COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              aria-label={key}
              aria-pressed={key === color}
              className={cn(
                "grid size-9 place-items-center rounded-full text-white ring-offset-2 ring-offset-background transition",
                CATEGORY_COLORS[key].solid,
                key === color && "ring-2 ring-foreground",
              )}
            >
              {key === color && <Check className="size-4" />}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {goal ? "Guardar cambios" : "Crear meta"}
        </Button>
        {goal && (
          <Button
            type="button"
            variant={confirmDelete ? "destructive" : "ghost"}
            className="h-11 text-muted-foreground data-[variant=destructive]:text-destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            <Trash2 />
            {confirmDelete ? "Toca de nuevo para confirmar" : "Eliminar meta"}
          </Button>
        )}
        {confirmDelete && (
          <p className="text-center text-xs text-muted-foreground">
            Se borra también el historial de aportes. El dinero no se mueve: es solo un registro.
          </p>
        )}
      </div>
    </form>
  );
}

type MovementFormProps = {
  goal: Goal;
  kind: "deposit" | "withdraw";
  onDone: () => void;
};

/** Aportar dinero a una meta o retirarlo. */
export function GoalMovementForm({ goal, kind: initialKind, onDone }: MovementFormProps) {
  const [kind, setKind] = useState(initialKind);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const deposit = kind === "deposit";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!value) {
      toast.error("Ingresa un monto mayor a 0");
      return;
    }
    if (!deposit && value > goal.saved) {
      toast.error(`Solo hay ${formatMoney(goal.saved)} reservados en esta meta`);
      return;
    }
    startTransition(async () => {
      const res = await addGoalMovement({ goalId: goal.id, kind, amount: value, date, note });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(deposit ? `Apartaste ${formatMoney(value)} para ${goal.name}` : "Retiro registrado");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-2 rounded-xl bg-muted p-1">
        {(["deposit", "withdraw"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            disabled={k === "withdraw" && goal.saved <= 0}
            className={cn(
              "h-10 rounded-lg text-sm font-medium transition disabled:opacity-40",
              kind === k ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {k === "deposit" ? "Aportar" : "Retirar"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
        <CategoryIcon icon={goal.icon} color={goal.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{goal.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            Reservado: {formatMoney(goal.saved)} de {formatMoney(goal.target)}
          </p>
        </div>
      </div>

      <div className="text-center">
        <Label htmlFor="mov-amount" className="justify-center text-muted-foreground">
          {deposit ? "¿Cuánto apartas?" : "¿Cuánto retiras?"}
        </Label>
        <div className="mt-1 flex items-baseline justify-center gap-1">
          <span className="shrink-0 text-3xl font-semibold text-muted-foreground" aria-hidden>
            {deposit ? "+" : "−"}$
          </span>
          <span className="inline-grid min-w-0 text-4xl font-semibold tabular-nums">
            <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
              {amount || "0"}
            </span>
            <input
              id="mov-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(formatAmountInput(e.target.value))}
              className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground/40"
            />
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mov-date">Fecha</Label>
          <Input
            id="mov-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mov-note">
            Nota <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="mov-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={deposit ? "Ej: Parte del aguinaldo" : "Ej: Pago de la seña"}
            maxLength={120}
            className="h-11 text-base"
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {deposit ? "Apartar dinero" : "Registrar retiro"}
      </Button>
    </form>
  );
}
