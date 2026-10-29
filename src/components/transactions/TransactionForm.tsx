"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  CreditCard as CreditCardIcon,
  Loader2,
  MoreHorizontal,
  Repeat,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { CATEGORY_COLORS } from "@/components/categories/CategoryIcon";
import { createCardPurchase, deleteCardPurchase, updateCardPurchase } from "@/lib/actions/cards";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/actions/transactions";
import { installmentSchedule } from "@/lib/finance/cards";
import {
  formatAmountInput,
  formatMoney,
  formatMonth,
  formatShortDate,
  parseAmount,
} from "@/lib/finance/format";
import type { Category, CreditCard, Transaction, TxType } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

/** Valores iniciales para un alta (repetir un movimiento o registrar un fijo). */
export type TransactionPrefill = Pick<
  Transaction,
  "type" | "amount" | "categoryId" | "subcategoryId" | "note" | "recurring"
>;

type Props = {
  categories: Category[];
  cards: CreditCard[];
  /** Usos por categoría: las más usadas se muestran primero */
  usage?: Record<string, number>;
  prefill?: TransactionPrefill;
  /** Abre un alta nueva con los datos de este movimiento */
  onRepeat?: (transaction: Transaction) => void;
  defaultType: TxType;
  defaultDate: string;
  /** Mes que se está viendo, para avisar si el movimiento queda en otro */
  viewMonth: string;
  transaction?: Transaction;
  onDone: () => void;
};

const amountToText = (n: number) => formatAmountInput(String(n).replace(".", ","));

const INSTALLMENT_OPTIONS = [1, 3, 6, 9, 12, 18, 24];

export function TransactionForm({
  categories,
  cards,
  usage,
  prefill,
  onRepeat,
  defaultType,
  defaultDate,
  viewMonth,
  transaction,
  onDone,
}: Props) {
  const router = useRouter();
  const initial = transaction ?? prefill;
  const [type, setType] = useState<TxType>(initial?.type ?? defaultType);
  const [amountText, setAmountText] = useState(initial ? amountToText(initial.amount) : "");
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(initial?.subcategoryId ?? null);
  const [date, setDate] = useState(transaction?.date ?? defaultDate);
  const [note, setNote] = useState(initial?.note ?? "");
  const [recurring, setRecurring] = useState(initial?.recurring ?? false);
  const [cardId, setCardId] = useState<string | null>(transaction?.cardId ?? null);
  const [installments, setInstallments] = useState(1);
  const [amountError, setAmountError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  // Las más usadas primero; a igual uso, orden alfabético (el que ya traen).
  const options = categories
    .filter((c) => c.type === type)
    .sort((a, b) => (usage?.[b.id] ?? 0) - (usage?.[a.id] ?? 0));
  const selected = options.find((c) => c.id === categoryId);
  // Solo las más usadas a la vista; si la elegida quedó fuera, se muestra igual.
  const [showAllCategories, setShowAllCategories] = useState(false);
  const VISIBLE_CATEGORIES = 7;
  const visibleOptions =
    showAllCategories || options.length <= VISIBLE_CATEGORIES + 1
      ? options
      : [
          ...options.slice(0, VISIBLE_CATEGORIES),
          ...(selected && !options.slice(0, VISIBLE_CATEGORIES).includes(selected) ? [selected] : []),
        ];
  const hiddenCount = options.length - visibleOptions.length;
  const isIncome = type === "income";
  // Una cuota de tarjeta se edita como compra: solo categoría y descripción.
  const purchaseId = transaction?.purchaseId ?? null;
  const card = cards.find((c) => c.id === cardId) ?? null;
  const parsedAmount = parseAmount(amountText);
  const schedule =
    card && !purchaseId && parsedAmount ? installmentSchedule(card, date, parsedAmount, installments) : null;

  function changeType(next: TxType) {
    if (next === type) return;
    setType(next);
    if (next === "income") setCardId(null);
    setCategoryId(null);
    setSubcategoryId(null);
  }

  function selectCategory(id: string) {
    setCategoryId((prev) => (prev === id ? null : id));
    setSubcategoryId(null);
  }


  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!purchaseId && !parseAmount(amountText)) {
      setAmountError(true);
      return;
    }
    if (purchaseId) {
      startTransition(async () => {
        const res = await updateCardPurchase(purchaseId, { categoryId, subcategoryId, note });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Compra actualizada en todas sus cuotas");
        onDone();
      });
      return;
    }
    const amount = parseAmount(amountText);
    if (!amount) {
      setAmountError(true);
      return;
    }

    if (card) {
      startTransition(async () => {
        const res = await createCardPurchase({
          cardId: card.id,
          amount,
          installments,
          date,
          categoryId,
          subcategoryId,
          note,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        const first = res.firstMonth ?? viewMonth;
        const label = installments > 1 ? `Compra en ${installments} cuotas registrada` : "Compra registrada";
        if (first !== viewMonth) {
          toast.success(`${label}. La primera cuota va en ${formatMonth(first)}`, {
            action: { label: "Ver tarjetas", onClick: () => router.push("/tarjetas") },
          });
        } else {
          toast.success(label);
        }
        onDone();
      });
      return;
    }

    startTransition(async () => {
      const input = { type, amount, date, categoryId, subcategoryId, note, recurring };
      const res = transaction
        ? await updateTransaction(transaction.id, input)
        : await createTransaction(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      const month = date.slice(0, 7);
      const label = isIncome ? "Ingreso" : "Gasto";
      if (month !== viewMonth) {
        toast.success(`${label} guardado en ${formatMonth(month)}`, {
          action: { label: "Ver", onClick: () => router.push(`/?m=${month}`) },
        });
      } else {
        toast.success(transaction ? `${label} actualizado` : `${label} registrado`);
      }
      onDone();
    });
  }

  function handleDelete() {
    if (!transaction) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = purchaseId
        ? await deleteCardPurchase(purchaseId)
        : await deleteTransaction(transaction.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(purchaseId ? "Compra eliminada (todas las cuotas)" : "Movimiento eliminado");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Tipo */}
      <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-2 rounded-xl bg-muted p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => changeType(t)}
            disabled={!!purchaseId}
            className={cn(
              "h-10 rounded-lg text-sm font-medium transition",
              type === t
                ? cn("bg-background shadow-sm", t === "income" ? "text-emerald-600" : "text-rose-600")
                : "text-muted-foreground",
            )}
          >
            {t === "income" ? "Ingreso" : "Gasto"}
          </button>
        ))}
      </div>

      {/* Monto */}
      <div className="text-center">
        <Label htmlFor="tx-amount" className="justify-center text-muted-foreground">
          Monto
        </Label>
        <div className="mt-1 flex max-w-full items-baseline justify-center gap-1 overflow-hidden">
          <span
            className={cn("shrink-0 text-3xl font-semibold", isIncome ? "text-emerald-600" : "text-rose-600")}
            aria-hidden
          >
            {isIncome ? "+" : "−"}$
          </span>
          {/* El texto invisible da el ancho exacto: signo y número quedan centrados juntos. */}
          <span className="inline-grid min-w-0 text-4xl font-semibold tabular-nums">
            <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
              {amountText || "0"}
            </span>
            <input
              id="tx-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amountText}
              onChange={(e) => {
                setAmountText(formatAmountInput(e.target.value));
                setAmountError(false);
              }}
              aria-invalid={amountError}
              autoFocus={!transaction}
              readOnly={!!purchaseId}
              className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground/40"
            />
          </span>
        </div>
        {amountError && <p className="mt-1 text-sm text-destructive">Ingresa un monto mayor a 0</p>}
      </div>

      {/* Pago con tarjeta */}
      {purchaseId && transaction?.installment ? (
        <div className="flex items-start gap-3 rounded-2xl border bg-muted/40 p-3 text-sm">
          <CreditCardIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p>
            Cuota {transaction.installment.n} de {transaction.installment.total}
            {card ? ` con ${card.name}` : ""}. Los cambios de categoría y descripción se aplican a todas
            las cuotas; para cambiar el monto, elimina la compra y vuelve a cargarla.
          </p>
        </div>
      ) : (
        !isIncome &&
        cards.length > 0 && (
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium">Medio de pago</legend>
            <div className="flex flex-wrap gap-2">
              {[null, ...cards].map((c) => {
                const active = (c?.id ?? null) === cardId;
                return (
                  <button
                    key={c?.id ?? "cash"}
                    type="button"
                    onClick={() => {
                      setCardId(c?.id ?? null);
                      if (!c) setInstallments(1);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition",
                      active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted",
                    )}
                  >
                    {c && <span className={cn("size-2.5 rounded-full", CATEGORY_COLORS[c.color]?.solid)} />}
                    {c?.name ?? "Efectivo / débito"}
                  </button>
                );
              })}
            </div>

            {card && (
              <div className="space-y-2 rounded-2xl border p-3">
                <Label htmlFor="tx-installments">Cuotas</Label>
                <div id="tx-installments" className="flex flex-wrap gap-1.5" role="radiogroup">
                  {INSTALLMENT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={installments === n}
                      onClick={() => setInstallments(n)}
                      className={cn(
                        "h-9 min-w-10 rounded-lg border px-2.5 text-sm tabular-nums transition",
                        installments === n ? "border-foreground bg-muted font-medium" : "hover:bg-muted/60",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {schedule
                    ? `${installments === 1 ? "Un pago" : `${installments} cuotas`} de ${formatMoney(schedule[0].amount)}. ${
                        installments === 1 ? "Vence" : "La primera vence"
                      } el ${formatShortDate(schedule[0].date)} (cierre día ${card.closingDay}).`
                    : "Ingresa el monto total de la compra para ver las cuotas."}
                </p>
              </div>
            )}
          </fieldset>
        )
      )}

      {/* Categoría */}
      <fieldset className="space-y-2.5">
        <legend className="text-sm font-medium">
          Categoría <span className="font-normal text-muted-foreground">(opcional)</span>
        </legend>
        {options.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No tienes categorías de {isIncome ? "ingresos" : "gastos"}.{" "}
            <Link href="/categorias" onClick={onDone} className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4">
              <Sparkles className="size-3.5" /> Configurarlas
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {visibleOptions.map((c) => {
              const active = c.id === categoryId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCategory(c.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition active:scale-95",
                    active ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/60",
                  )}
                >
                  <CategoryIcon icon={c.icon} color={c.color} />
                  <span className="line-clamp-2 text-center text-[11px] leading-tight">{c.name}</span>
                </button>
              );
            })}
            {(hiddenCount > 0 || showAllCategories) && options.length > VISIBLE_CATEGORIES + 1 && (
              <button
                type="button"
                onClick={() => setShowAllCategories((v) => !v)}
                aria-expanded={showAllCategories}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-transparent p-2 text-muted-foreground transition hover:bg-muted/60 active:scale-95"
              >
                <span className="grid size-10 place-items-center rounded-xl border border-dashed">
                  {showAllCategories ? <ChevronUp className="size-5" /> : <MoreHorizontal className="size-5" />}
                </span>
                <span className="text-center text-[11px] leading-tight">
                  {showAllCategories ? "Menos" : `${hiddenCount} más`}
                </span>
              </button>
            )}
          </div>
        )}

        {selected && selected.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1" aria-label={`Subcategoría de ${selected.name}`}>
            {selected.subcategories.map((s) => {
              const active = s.id === subcategoryId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubcategoryId(active ? null : s.id)}
                  aria-pressed={active}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-sm transition",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tx-date">{purchaseId ? "Vencimiento de la cuota" : card ? "Fecha de compra" : "Fecha"}</Label>
          <Input
            id="tx-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            readOnly={!!purchaseId}
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-note">
            Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="tx-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isIncome ? "Ej: Sueldo de octubre" : "Ej: Compra semanal"}
            maxLength={120}
            className="h-11 text-base"
          />
        </div>
      </div>

      {!card && !purchaseId && (
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border p-3">
          <Repeat className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Es fijo todos los meses</span>
            <span className="block text-xs text-muted-foreground">
              Te lo recordamos el mes que viene para registrarlo con un toque.
            </span>
          </span>
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="size-5 accent-foreground"
          />
        </label>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className={cn(
            "h-12 text-base text-white",
            isIncome ? "bg-emerald-600 hover:bg-emerald-600/90" : "bg-rose-600 hover:bg-rose-600/90",
          )}
        >
          {pending && <Loader2 className="animate-spin" />}
          {transaction
            ? "Guardar cambios"
            : isIncome
              ? "Registrar ingreso"
              : card
                ? "Registrar compra"
                : "Registrar gasto"}
        </Button>
        {transaction && !purchaseId && onRepeat && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => onRepeat(transaction)}
            disabled={pending}
          >
            <Repeat /> Registrar de nuevo
          </Button>
        )}
        {transaction && (
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
              : purchaseId
                ? "Eliminar compra (todas las cuotas)"
                : "Eliminar movimiento"}
          </Button>
        )}
      </div>
    </form>
  );
}
