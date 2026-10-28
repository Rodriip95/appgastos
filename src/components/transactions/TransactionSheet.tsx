"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { formatMoney, todayKey } from "@/lib/finance/format";
import type { Category, CreditCard, Transaction, TxType } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type SheetState = { open: boolean; type: TxType; transaction?: Transaction; key: number };

type Ctx = {
  cards: CreditCard[];
  openNew: (type: TxType) => void;
  openEdit: (transaction: Transaction) => void;
};

const TransactionSheetContext = createContext<Ctx | null>(null);

function useTransactionSheet() {
  const ctx = useContext(TransactionSheetContext);
  if (!ctx) throw new Error("useTransactionSheet debe usarse dentro de TransactionSheetProvider");
  return ctx;
}

type ProviderProps = {
  categories: Category[];
  cards: CreditCard[];
  /** Mes que se está viendo (YYYY-MM) */
  month: string;
  currentMonth: string;
  children: ReactNode;
};

/**
 * Maneja el formulario de alta/edición de movimientos para toda la vista del mes
 * (los botones de alta están en `QuickActions`).
 */
export function TransactionSheetProvider({ categories, cards, month, currentMonth, children }: ProviderProps) {
  const [state, setState] = useState<SheetState>({ open: false, type: "expense", key: 0 });

  const ctx: Ctx = {
    cards,
    openNew: (type) => setState((s) => ({ open: true, type, key: s.key + 1 })),
    openEdit: (transaction) =>
      setState((s) => ({ open: true, type: transaction.type, transaction, key: s.key + 1 })),
  };

  // En el mes actual se propone hoy; en meses pasados, el primer día de ese mes.
  const defaultDate = month === currentMonth ? todayKey() : `${month}-01`;
  const title = state.transaction
    ? "Editar movimiento"
    : state.type === "income"
      ? "Nuevo ingreso"
      : "Nuevo gasto";

  return (
    <TransactionSheetContext.Provider value={ctx}>
      {children}

      <ResponsiveSheet
        open={state.open}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
        title={title}
      >
        <TransactionForm
          key={state.key}
          categories={categories}
          cards={cards}
          defaultType={state.type}
          defaultDate={defaultDate}
          viewMonth={month}
          transaction={state.transaction}
          onDone={() => setState((s) => ({ ...s, open: false }))}
        />
      </ResponsiveSheet>
    </TransactionSheetContext.Provider>
  );
}

/**
 * Botones para registrar movimientos, pensados para ir dentro de la tarjeta de
 * balance (fondo oscuro): el gasto, la acción más frecuente, va destacado.
 */
export function QuickActions() {
  const { openNew } = useTransactionSheet();
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => openNew("income")}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary-foreground/10 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/15 active:scale-[0.97]"
      >
        <span className="grid size-6 place-items-center rounded-full bg-emerald-400/20 text-emerald-300 dark:text-emerald-700">
          <Plus className="size-3.5" strokeWidth={2.5} />
        </span>
        Ingreso
      </button>
      <button
        type="button"
        onClick={() => openNew("expense")}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary-foreground text-sm font-semibold text-primary shadow-sm transition hover:bg-primary-foreground/90 active:scale-[0.97]"
      >
        <span className="grid size-6 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
          <Minus className="size-3.5" strokeWidth={2.5} />
        </span>
        Gasto
      </button>
    </div>
  );
}

/** Fila de movimiento; al tocarla se abre para editar. */
export function TransactionRow({
  transaction,
  category,
}: {
  transaction: Transaction;
  category: Category | null;
}) {
  const { cards, openEdit } = useTransactionSheet();
  const card = transaction.cardId ? cards.find((c) => c.id === transaction.cardId) : null;
  const cuota = transaction.installment
    ? transaction.installment.total > 1
      ? `${card?.name ?? "Tarjeta"} ${transaction.installment.n}/${transaction.installment.total}`
      : (card?.name ?? "Tarjeta")
    : null;
  const sub = category?.subcategories.find((s) => s.id === transaction.subcategoryId);
  const income = transaction.type === "income";
  const title = transaction.note || sub?.name || category?.name || (income ? "Ingreso" : "Gasto");
  const subtitle = [category?.name ?? "Sin categoría", transaction.note ? sub?.name : null, cuota]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => openEdit(transaction)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/50 active:bg-muted"
    >
      <CategoryIcon icon={category?.icon} color={category?.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          income ? "text-emerald-600" : "text-foreground",
        )}
      >
        {income ? "+" : "−"}
        {formatMoney(transaction.amount)}
      </span>
    </button>
  );
}
