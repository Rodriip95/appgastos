"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Loader2, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { TransactionForm, type TransactionPrefill } from "@/components/transactions/TransactionForm";
import { deleteTransaction } from "@/lib/actions/transactions";
import { formatMoney, todayKey } from "@/lib/finance/format";
import type { Category, CreditCard, Transaction, TxType } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type SheetState = {
  open: boolean;
  type: TxType;
  transaction?: Transaction;
  prefill?: TransactionPrefill;
  key: number;
};

type Ctx = {
  cards: CreditCard[];
  demo: boolean;
  openNew: (type?: TxType, prefill?: TransactionPrefill) => void;
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
  /** Usos por categoría, para mostrar primero las más frecuentes */
  usage?: Record<string, number>;
  /** Modo demo: nada se guarda */
  demo?: boolean;
  children: ReactNode;
};

/**
 * Maneja el formulario de alta/edición de movimientos para toda la vista del mes.
 * Lo abren `RegisterButton`, `ScrollAddButton`, `RecurringSuggestions` y las filas.
 */
export function TransactionSheetProvider({
  categories,
  cards,
  month,
  currentMonth,
  usage,
  demo = false,
  children,
}: ProviderProps) {
  const [state, setState] = useState<SheetState>({ open: false, type: "expense", key: 0 });

  const ctx: Ctx = {
    cards,
    demo,
    openNew: (type = "expense", prefill) =>
      setState((s) => ({ open: true, type: prefill?.type ?? type, prefill, key: s.key + 1 })),
    openEdit: (transaction) =>
      setState((s) => ({ open: true, type: transaction.type, transaction, key: s.key + 1 })),
  };

  // En el mes actual se propone hoy; en meses pasados, el primer día de ese mes.
  const defaultDate = month === currentMonth ? todayKey() : `${month}-01`;
  const title = state.transaction
    ? "Editar movimiento"
    : state.prefill
      ? "Registrar de nuevo"
      : "Nuevo movimiento";

  return (
    <TransactionSheetContext.Provider value={ctx}>
      {children}
      <ScrollAddButton />

      <ResponsiveSheet
        open={state.open}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
        title={title}
      >
        <TransactionForm
          key={state.key}
          categories={categories}
          cards={cards}
          usage={usage}
          demo={demo}
          defaultType={state.type}
          defaultDate={defaultDate}
          viewMonth={month}
          transaction={state.transaction}
          prefill={state.prefill}
          onRepeat={(tx) =>
            setState((s) => ({
              open: true,
              type: tx.type,
              key: s.key + 1,
              prefill: {
                type: tx.type,
                amount: tx.amount,
                categoryId: tx.categoryId,
                subcategoryId: tx.subcategoryId,
                note: tx.note,
                recurring: tx.recurring,
              },
            }))
          }
          onDone={() => setState((s) => ({ ...s, open: false }))}
        />
      </ResponsiveSheet>
    </TransactionSheetContext.Provider>
  );
}

const REGISTER_ID = "register-movement";

/** Acción principal del mes: un solo botón; el tipo se elige dentro del formulario. */
export function RegisterButton() {
  const { openNew } = useTransactionSheet();
  return (
    <button
      id={REGISTER_ID}
      type="button"
      onClick={() => openNew()}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary-foreground text-sm font-semibold text-primary shadow-sm transition hover:bg-primary-foreground/90 active:scale-[0.98]"
    >
      <Plus className="size-4" strokeWidth={2.5} />
      Registrar movimiento
    </button>
  );
}

/** Botón compacto que aparece cuando el botón principal sale de la pantalla. */
function ScrollAddButton() {
  const { openNew } = useTransactionSheet();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(REGISTER_ID);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      rootMargin: "-56px 0px 0px 0px", // descuenta el header fijo
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={() => openNew()}
      aria-label="Registrar movimiento"
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed right-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/20 transition duration-200 active:scale-95 md:right-8 md:bottom-8",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <Plus className="size-6" strokeWidth={2.5} />
    </button>
  );
}

/** Gastos/ingresos fijos del mes anterior que faltan registrar este mes. */
export function RecurringSuggestions({
  pending,
  categories,
}: {
  pending: Transaction[];
  categories: Category[];
}) {
  const { openNew } = useTransactionSheet();
  if (pending.length === 0) return null;
  const byId = new Map(categories.map((c) => [c.id, c]));

  return (
    <section aria-label="Fijos pendientes" className="rounded-3xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Repeat className="size-4 text-muted-foreground" />
        <h2 className="font-semibold">Fijos pendientes</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
          {pending.length}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Los registraste el mes pasado y todavía no aparecen en este.
      </p>
      <ul className="mt-3 space-y-1">
        {pending.map((t) => {
          const c = (t.categoryId && byId.get(t.categoryId)) || null;
          return (
            <li key={t.id} className="flex items-center gap-3 py-1.5">
              <CategoryIcon icon={c?.icon} color={c?.color} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.note || c?.name || "Movimiento fijo"}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatMoney(t.amount)} el mes pasado
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openNew(t.type, {
                    type: t.type,
                    amount: t.amount,
                    categoryId: t.categoryId,
                    subcategoryId: t.subcategoryId,
                    note: t.note,
                    recurring: true,
                  })
                }
                className="h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition hover:bg-muted"
              >
                Registrar
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const SWIPE_OPEN = -88;

/** Fila de movimiento: tocar abre la edición; deslizar a la izquierda muestra "Eliminar". */
export function TransactionRow({
  transaction,
  category,
}: {
  transaction: Transaction;
  category: Category | null;
}) {
  const { cards, demo, openEdit } = useTransactionSheet();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const drag = useRef<{ x: number; base: number; moved: boolean } | null>(null);

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
  // Las cuotas se borran como compra completa desde el formulario, no con un gesto.
  const swipeable = !transaction.purchaseId;

  function handleDelete() {
    if (demo) {
      toast.info("Modo demo: los cambios no se guardan");
      setOffset(0);
      return;
    }
    startTransition(async () => {
      const res = await deleteTransaction(transaction.id);
      if (!res.ok) {
        toast.error(res.error);
        setOffset(0);
        return;
      }
      toast.success("Movimiento eliminado");
    });
  }

  return (
    <div className="relative overflow-hidden">
      {swipeable && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          tabIndex={offset ? 0 : -1}
          aria-hidden={!offset}
          className="absolute inset-y-0 right-0 flex w-22 flex-col items-center justify-center gap-1 bg-destructive text-xs font-medium text-white"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Eliminar
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          if (drag.current?.moved) return;
          if (offset) setOffset(0);
          else openEdit(transaction);
        }}
        onPointerDown={(e) => {
          if (!swipeable || e.pointerType !== "touch") return;
          drag.current = { x: e.clientX, base: offset, moved: false };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          if (Math.abs(dx) > 6) drag.current.moved = true;
          setOffset(Math.min(0, Math.max(SWIPE_OPEN - 20, drag.current.base + dx)));
        }}
        onPointerUp={() => {
          if (!drag.current) return;
          setDragging(false);
          setOffset((o) => (o < SWIPE_OPEN / 2 ? SWIPE_OPEN : 0));
          // Deja pasar el click que sigue al gesto sin abrir la edición.
          setTimeout(() => (drag.current = null), 0);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
          setOffset(0);
        }}
        style={{ transform: `translateX(${offset}px)` }}
        className={cn(
          "relative flex w-full touch-pan-y items-center gap-3 bg-card px-4 py-3 text-left transition-[background-color] hover:bg-muted/50 active:bg-muted",
          !dragging && "transition-transform duration-200",
        )}
      >
        <CategoryIcon icon={category?.icon} color={category?.color} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            <span className="truncate">{title}</span>
            {transaction.recurring && (
              <Repeat className="size-3 shrink-0 text-muted-foreground" aria-label="Fijo mensual" />
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            income ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
          )}
        >
          {income ? "+" : "−"}
          {formatMoney(transaction.amount)}
        </span>
      </button>
    </div>
  );
}
