"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox, Search, SearchX, X } from "lucide-react";
import { TransactionRow } from "@/components/transactions/TransactionSheet";
import { formatDayLabel, formatMoney, formatMonthShort } from "@/lib/finance/format";
import type { Category, Transaction } from "@/lib/finance/types";

type Props = {
  transactions: Transaction[];
  categories: Category[];
  month: string;
  today: string;
  /** Categoría por la que se filtra ("none" = sin categoría); viene de la URL */
  filterKey?: string | null;
  /** Link para quitar el filtro */
  clearFilterHref: string;
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function TransactionList({
  transactions,
  categories,
  month,
  today,
  filterKey,
  clearFilterHref,
}: Props) {
  const [query, setQuery] = useState("");

  if (transactions.length === 0) {
    return (
      <section className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-muted">
          <Inbox className="size-6 text-muted-foreground" />
        </span>
        <h2 className="mt-3 font-semibold">Sin movimientos en {formatMonthShort(month)}</h2>
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
  const visible = transactions.filter((t) => {
    const c = categoryOf(t);
    if (filterKey && (c?.id ?? "none") !== filterKey) return false;
    if (!q) return true;
    const sub = c?.subcategories.find((s) => s.id === t.subcategoryId)?.name ?? "";
    return normalize(`${t.note} ${c?.name ?? ""} ${sub}`).includes(q);
  });

  const days = new Map<string, Transaction[]>();
  for (const tx of visible) days.set(tx.date, [...(days.get(tx.date) ?? []), tx]);

  return (
    <section id="movimientos" className="scroll-mt-20 space-y-4" aria-label="Movimientos">
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Movimientos</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {visible.length} de {transactions.length}
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
        [...days].map(([date, items]) => {
          const net = items.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
          return (
            <div key={date} className="space-y-1.5">
              <div className="flex items-baseline justify-between px-1 text-xs font-medium text-muted-foreground">
                <span>{formatDayLabel(date, today)}</span>
                <span className="tabular-nums">
                  {net > 0 ? "+" : net < 0 ? "−" : ""}
                  {formatMoney(Math.abs(Math.round(net * 100) / 100))}
                </span>
              </div>
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                {items.map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow transaction={tx} category={categoryOf(tx)} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}

      <p className="px-1 text-center text-xs text-muted-foreground md:hidden">
        Desliza un movimiento a la izquierda para eliminarlo.
      </p>
    </section>
  );
}
