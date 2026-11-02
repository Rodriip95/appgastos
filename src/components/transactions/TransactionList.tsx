"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Inbox, Search, SearchX, X } from "lucide-react";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { ShowMoreButton } from "@/components/common/CollapsibleList";
import { TransactionRow } from "@/components/transactions/TransactionSheet";
import { cardOf, statementKey, statementTotal } from "@/lib/finance/cards";
import { formatTotals } from "@/lib/finance/currency";
import { formatDayLabel, formatMoney, formatMonthShort } from "@/lib/finance/format";
import type { Category, CreditCard, Transaction } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Props = {
  transactions: Transaction[];
  categories: Category[];
  /** Los consumos de cada tarjeta se muestran juntos, en una fila por resumen */
  cards: CreditCard[];
  /** Resúmenes pagados (`cardId:YYYY-MM`); los demás se ven pero no suman */
  paidStatements: string[];
  /** Qué se está viendo, para el estado vacío: "Octubre", "este período"… */
  scopeLabel: string;
  today: string;
  /** Categoría por la que se filtra ("none" = sin categoría); viene de la URL */
  filterKey?: string | null;
  /** Link para quitar el filtro */
  clearFilterHref: string;
};

const DAYS_STEP = 7;

/** Lo que se lista en un día: un movimiento o el resumen de una tarjeta con sus consumos. */
type Entry =
  | { kind: "tx"; tx: Transaction }
  | { kind: "card"; key: string; card: CreditCard; month: string; items: Transaction[]; paid: boolean };

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function TransactionList({
  transactions,
  categories,
  cards,
  paidStatements,
  scopeLabel,
  today,
  filterKey,
  clearFilterHref,
}: Props) {
  const [query, setQuery] = useState("");
  // Días visibles: el mes completo puede ser muy largo; se carga de a tandas.
  const [dayLimit, setDayLimit] = useState(DAYS_STEP);

  if (transactions.length === 0) {
    return (
      <section className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-muted">
          <Inbox className="size-6 text-muted-foreground" />
        </span>
        <h2 className="mt-3 font-semibold">Sin movimientos en {scopeLabel}</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Registra el primero con los botones <strong className="font-medium text-foreground">+</strong>{" "}
          y <strong className="font-medium text-foreground">−</strong> de la tarjeta de balance.
        </p>
      </section>
    );
  }

  const byId = new Map(categories.map((c) => [c.id, c]));
  const categoryOf = (t: Transaction) => (t.categoryId && byId.get(t.categoryId)) || null;
  const filterCategory = filterKey && filterKey !== "none" ? byId.get(filterKey) : null;

  // Busca en descripción, categoría y subcategoría, sin importar tildes ni mayúsculas.
  const q = normalize(query.trim());
  const paidSet = new Set(paidStatements);
  const visible = transactions.filter((t) => {
    const c = categoryOf(t);
    const card = cardOf(t, cards);
    // En "¿En qué se fue?" las tarjetas van aparte: el filtro por categoría no las incluye.
    if (filterKey && (card || (c?.id ?? "none") !== filterKey)) return false;
    if (!q) return true;
    const sub = c?.subcategories.find((s) => s.id === t.subcategoryId)?.name ?? "";
    return normalize(`${t.alias} ${t.note} ${c?.name ?? ""} ${sub} ${card?.name ?? ""}`).includes(q);
  });

  const searching = Boolean(q) || Boolean(filterKey);
  // Por día, los consumos de cada tarjeta se juntan en una sola fila (el resumen de ese mes).
  const days = new Map<string, Entry[]>();
  for (const tx of visible) {
    const entries = days.get(tx.date) ?? [];
    const card = cardOf(tx, cards);
    if (card) {
      const key = statementKey(card.id, tx.month);
      const group = entries.find((e) => e.kind === "card" && e.key === key);
      if (group?.kind === "card") group.items.push(tx);
      else entries.push({ kind: "card", key, card, month: tx.month, items: [tx], paid: paidSet.has(key) });
    } else {
      entries.push({ kind: "tx", tx });
    }
    days.set(tx.date, entries);
  }
  const rowCount = [...days.values()].reduce((n, entries) => n + entries.length, 0);
  const itemsOf = (entries: Entry[]) =>
    entries.flatMap((e) => (e.kind === "tx" ? [e.tx] : e.paid ? e.items : []));

  return (
    <section id="movimientos" className="scroll-mt-20 space-y-4" aria-label="Movimientos">
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Movimientos</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {visible.length === transactions.length ? rowCount : `${rowCount} de ${transactions.length}`}
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por descripción o categoría"
            aria-label="Buscar movimientos"
            className="h-10 w-full rounded-xl border bg-card pr-9 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {filterKey && (
          <Link
            href={clearFilterHref}
            scroll={false}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground pr-2 pl-3 text-xs font-medium text-background"
          >
            {filterCategory?.name ?? "Sin categoría"}
            <X className="size-3.5" aria-label="Quitar filtro" />
          </Link>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          <SearchX className="size-5" />
          No hay movimientos que coincidan.
        </div>
      ) : (
        [...days].slice(0, searching ? undefined : dayLimit).map(([date, entries]) => {
          // Neto del día por moneda (pesos y dólares no se suman); un resumen sin pagar no cuenta.
          const items = itemsOf(entries);
          const netOf = (currency: Transaction["currency"]) =>
            Math.round(
              items
                .filter((t) => t.currency === currency)
                .reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0) * 100,
            ) / 100;
          const net = netOf("ARS");
          const netUsd = netOf("USD");
          const hasUsd = items.some((t) => t.currency === "USD");
          const hasArs = items.some((t) => t.currency !== "USD");
          const signed = (n: number, currency: Transaction["currency"]) =>
            `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatMoney(Math.abs(n), currency)}`;
          return (
            <div key={date} className="space-y-1.5">
              <div className="flex items-baseline justify-between px-1 text-xs font-medium text-muted-foreground">
                <span>{formatDayLabel(date, today)}</span>
                <span className="tabular-nums">
                  {[hasArs && signed(net, "ARS"), hasUsd && signed(netUsd, "USD")].filter(Boolean).join(" · ")}
                </span>
              </div>
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                {entries.map((e) =>
                  e.kind === "tx" ? (
                    <li key={e.tx.id}>
                      <TransactionRow transaction={e.tx} category={categoryOf(e.tx)} />
                    </li>
                  ) : (
                    <li key={e.key}>
                      <StatementRow entry={e} />
                    </li>
                  ),
                )}
              </ul>
            </div>
          );
        })
      )}

      {!searching && days.size > dayLimit && (
        <ShowMoreButton
          expanded={false}
          onClick={() => setDayLimit((n) => n + DAYS_STEP)}
          label={`Ver movimientos anteriores (${[...days].slice(dayLimit).reduce((n, [, entries]) => n + entries.length, 0)} más)`}
        />
      )}

      <p className="px-1 text-center text-xs text-muted-foreground md:hidden">
        Desliza un movimiento a la izquierda para eliminarlo.
      </p>
    </section>
  );
}

/** Resumen de una tarjeta en la lista: una sola fila que lleva al detalle de sus consumos. */
function StatementRow({ entry }: { entry: Extract<Entry, { kind: "card" }> }) {
  const { card, month, items, paid } = entry;
  const total = statementTotal(card.id, month, items);
  const count = items.length === 1 ? "1 consumo" : `${items.length} consumos`;
  return (
    <Link
      href={`/tarjetas/${card.id}?m=${month}`}
      className="flex w-full items-center gap-3 bg-card px-4 py-3 text-left transition-[background-color] hover:bg-muted/50 active:bg-muted"
    >
      <CategoryIcon icon="credit-card" color={card.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{card.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          Resumen de {formatMonthShort(month)} · {count} ·{" "}
          <span className={paid ? undefined : "text-amber-600 dark:text-amber-400"}>
            {paid ? "Pagado" : "Sin pagar, todavía no suma"}
          </span>
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          !paid && "text-muted-foreground",
        )}
      >
        −{formatTotals(total)}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
