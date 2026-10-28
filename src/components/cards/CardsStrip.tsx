import Link from "next/link";
import { ChevronRight, CreditCard as CreditCardIcon } from "lucide-react";
import { CATEGORY_COLORS } from "@/components/categories/CategoryIcon";
import { activePurchases, daysBetween, nextDueDate, statementTotal } from "@/lib/finance/cards";
import { formatMoney, formatShortDate } from "@/lib/finance/format";
import type { CreditCard, Transaction } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Props = {
  cards: CreditCard[];
  /** Cuotas de tarjeta desde el mes actual en adelante */
  upcoming: Transaction[];
  today: string;
};

const whenLabel = (days: number) =>
  days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`;

/** Tarjetas del usuario en la home: próximo vencimiento y cuotas activas. */
export function CardsStrip({ cards, upcoming, today }: Props) {
  if (cards.length === 0) return null;

  return (
    <section aria-label="Tarjetas" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Tarjetas</h2>
        <Link
          href="/tarjetas"
          className="flex items-center gap-0.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Ver detalle <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Carrusel horizontal en mobile; se sale del padding para llegar al borde */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
        {cards.map((card) => {
          const due = nextDueDate(card, today);
          const days = daysBetween(today, due);
          const amount = statementTotal(card.id, due.slice(0, 7), upcoming);
          const purchases = activePurchases(card.id, upcoming).length;

          return (
            <li key={card.id} className={cn("shrink-0 snap-start", cards.length === 1 ? "w-full" : "w-64")}>
              <Link
                href="/tarjetas"
                className={cn(
                  "relative flex h-36 flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-sm transition active:scale-[0.98]",
                  CATEGORY_COLORS[card.color]?.solid ?? "bg-slate-500",
                )}
              >
                {/* Brillo sutil tipo tarjeta física */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/25 via-transparent to-black/20"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-white/10"
                />

                <div className="relative flex items-start justify-between gap-2">
                  <span className="truncate font-semibold">{card.name}</span>
                  <CreditCardIcon className="size-5 shrink-0 opacity-80" />
                </div>

                <div className="relative">
                  <p className="text-xs text-white/80">
                    Vence {formatShortDate(due)} · {whenLabel(days)}
                  </p>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatMoney(amount)}</p>
                  <p className="text-xs text-white/70">
                    {purchases === 0
                      ? "Sin cuotas pendientes"
                      : purchases === 1
                        ? "1 compra en cuotas"
                        : `${purchases} compras en cuotas`}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
