"use client";

import { useState, useTransition } from "react";
import { Check, CircleDashed, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import { deleteCardPurchase, setStatementPaid, updateCardPurchase } from "@/lib/actions/cards";
import { toArs } from "@/lib/finance/currency";
import {
  formatAmountInput,
  formatMoney,
  formatMonthShort,
  formatShortDate,
  parseAmount,
} from "@/lib/finance/format";
import type { Category, Transaction } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

/** Marca o desmarca el resumen del mes como pagado (recién ahí sus consumos cuentan como gasto). */
export function StatementPaidButton({
  cardId,
  month,
  paid,
  className,
}: {
  cardId: string;
  month: string;
  paid: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await setStatementPaid(cardId, month, !paid);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        paid
          ? `Resumen de ${formatMonthShort(month)} sin pagar: ya no cuenta como gasto`
          : `Resumen de ${formatMonthShort(month)} pagado: ya cuenta como gasto`,
      );
    });
  }

  return (
    <Button
      type="button"
      variant={paid ? "outline" : "default"}
      onClick={toggle}
      disabled={pending}
      className={cn("h-10", className)}
    >
      {pending ? <Loader2 className="animate-spin" /> : paid ? <Check /> : <CircleDashed />}
      {paid ? "Pagado" : "Marcar como pagado"}
    </Button>
  );
}

/** Consumos de un resumen. Tocar uno abre la edición (alias, descripción, categoría, monto o eliminar). */
export function ConsumptionList({
  items,
  categories,
}: {
  items: Transaction[];
  categories: Category[];
}) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);
  const byId = new Map(categories.map((c) => [c.id, c]));

  return (
    <>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {items.map((t) => {
          const category = (t.categoryId && byId.get(t.categoryId)) || null;
          const title = t.alias || t.note || category?.name || "Consumo";
          const details = [
            t.alias && t.note ? t.note : null,
            category?.name ?? "Sin categoría",
            t.installment && t.installment.total > 1 ? `Cuota ${t.installment.n}/${t.installment.total}` : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setEditing(t);
                  setOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/50 active:bg-muted"
              >
                <CategoryIcon icon={category?.icon} color={category?.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="truncate text-xs text-muted-foreground">{details}</p>
                </div>
                <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatMoney(t.amount, t.currency)}
                  {t.currency === "USD" && t.arsRate && (
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      ≈ {formatMoney(Math.round(toArs(t)))}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Editar consumo">
        {editing && (
          <ConsumptionForm
            key={editing.id}
            transaction={editing}
            categories={categories.filter((c) => c.type === "expense")}
            onDone={() => setOpen(false)}
          />
        )}
      </ResponsiveSheet>
    </>
  );
}

const amountToText = (n: number) => formatAmountInput(String(n).replace(".", ","));

function ConsumptionForm({
  transaction: t,
  categories,
  onDone,
}: {
  transaction: Transaction;
  categories: Category[];
  onDone: () => void;
}) {
  const [alias, setAlias] = useState(t.alias);
  const [note, setNote] = useState(t.note);
  const [categoryId, setCategoryId] = useState(t.categoryId);
  const [subcategoryId, setSubcategoryId] = useState(t.subcategoryId);
  const [amountText, setAmountText] = useState(amountToText(t.amount));
  const multi = (t.installment?.total ?? 1) > 1;
  // Por defecto el monto se corrige desde esta cuota en adelante (las anteriores ya se pagaron).
  const [scope, setScope] = useState<"from" | "all">("from");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const selected = categories.find((c) => c.id === categoryId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!t.purchaseId) return;
    const amount = parseAmount(amountText);
    if (!amount) {
      toast.error("Ingresa un monto mayor a 0");
      return;
    }
    const purchaseId = t.purchaseId;
    startTransition(async () => {
      const res = await updateCardPurchase(purchaseId, {
        alias,
        note,
        categoryId,
        subcategoryId,
        ...(amount !== t.amount ? { amount, fromMonth: scope === "from" ? t.month : undefined } : {}),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(multi ? "Consumo actualizado en sus cuotas" : "Consumo actualizado");
      onDone();
    });
  }

  function handleDelete() {
    if (!t.purchaseId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const purchaseId = t.purchaseId;
    startTransition(async () => {
      const res = await deleteCardPurchase(purchaseId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(multi ? "Consumo eliminado (todas las cuotas)" : "Consumo eliminado");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <Label htmlFor="c-alias">Alias</Label>
        <Input
          id="c-alias"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Ej: Zapatillas running"
          maxLength={40}
          className="h-11 text-base"
        />
        <p className="text-xs text-muted-foreground">Así lo vas a ver en la home y en la tarjeta.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="c-note">Descripción del resumen</Label>
        <Input
          id="c-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: MERPAGO*DEPORTES"
          maxLength={120}
          className="h-11 text-base"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="c-amount">
          {multi ? "Monto de la cuota" : "Monto"} ({t.currency === "USD" ? "US$" : "$"})
        </Label>
        <Input
          id="c-amount"
          inputMode="decimal"
          autoComplete="off"
          value={amountText}
          onChange={(e) => setAmountText(formatAmountInput(e.target.value))}
          className="h-11 text-base tabular-nums"
        />
        {multi && (
          <div role="radiogroup" aria-label="Cuotas a corregir" className="grid grid-cols-2 gap-1.5 pt-1">
            {(
              [
                ["from", `Desde esta cuota (${t.installment?.n}/${t.installment?.total})`],
                ["all", "Todas las cuotas"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={scope === value}
                onClick={() => setScope(value)}
                className={cn(
                  "h-9 rounded-lg border px-2 text-xs transition",
                  scope === value ? "border-foreground bg-muted font-medium" : "hover:bg-muted/60",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <fieldset className="space-y-2.5">
        <legend className="text-sm font-medium">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setCategoryId(active ? null : c.id);
                  setSubcategoryId(null);
                }}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full border pr-3.5 pl-1 text-sm transition",
                  active ? "border-foreground bg-muted" : "border-border hover:bg-muted/60",
                )}
              >
                <CategoryIcon icon={c.icon} color={c.color} size="sm" className="size-7" />
                {c.name}
              </button>
            );
          })}
        </div>
        {selected && selected.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1" aria-label={`Subcategoría de ${selected.name}`}>
            {selected.subcategories.map((s) => {
              const active = s.id === subcategoryId;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSubcategoryId(active ? null : s.id)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs transition",
                    active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted",
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <p className="text-xs text-muted-foreground">
        Vence el {formatShortDate(t.date)}
        {multi ? `. Alias, descripción y categoría se cambian en todas las cuotas.` : "."}
      </p>

      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={pending} className="h-12 text-base">
          {pending && <Loader2 className="animate-spin" />}
          Guardar cambios
        </Button>
        <Button
          type="button"
          variant={confirmDelete ? "destructive" : "ghost"}
          className="h-11 text-muted-foreground data-[variant=destructive]:text-destructive"
          onClick={handleDelete}
          disabled={pending}
        >
          <Trash2 />
          {confirmDelete
            ? "Toca de nuevo para confirmar"
            : multi
              ? "Eliminar consumo (todas las cuotas)"
              : "Eliminar consumo"}
        </Button>
      </div>
    </form>
  );
}
