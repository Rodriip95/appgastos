import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { CreditCard as CreditCardIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_COLORS } from "@/components/categories/CategoryIcon";
import { EditCardButton, NewCardButton } from "@/components/cards/CardSheets";
import { getCards } from "@/lib/data/cards";
import { getUpcomingCardTransactions } from "@/lib/data/transactions";
import {
  activePurchases,
  daysBetween,
  nextDueDate,
  statementTotal,
} from "@/lib/finance/cards";
import { formatMoney, formatMonthShort, formatShortDate, shiftMonth, todayKey } from "@/lib/finance/format";
import type { CreditCard, Transaction } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tarjetas · Bingo" };

/** Meses de resúmenes futuros que se muestran por tarjeta. */
const MONTHS_AHEAD = 6;

export default function CardsPage() {
  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarjetas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tus compras en cuotas, mes a mes, y cuándo vence cada resumen.
          </p>
        </div>
        <NewCardButton />
      </div>
      <Suspense fallback={<CardsSkeleton />}>
        <CardsContent />
      </Suspense>
    </main>
  );
}

async function CardsContent() {
  await io(); // "hoy" se calcula en cada request
  const today = todayKey();
  const [cards, upcoming] = await Promise.all([
    getCards(),
    getUpcomingCardTransactions(today.slice(0, 7)),
  ]);

  if (cards.length === 0) return <EmptyCards />;

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <li key={card.id}>
          <CardSummary card={card} upcoming={upcoming} today={today} />
        </li>
      ))}
    </ul>
  );
}

function CardSummary({
  card,
  upcoming,
  today,
}: {
  card: CreditCard;
  upcoming: Transaction[];
  today: string;
}) {
  const due = nextDueDate(card, today);
  const daysLeft = daysBetween(today, due);
  const dueAmount = statementTotal(card.id, due.slice(0, 7), upcoming);
  const months = Array.from({ length: MONTHS_AHEAD }, (_, i) => {
    const month = shiftMonth(due.slice(0, 7), i);
    return { month, total: statementTotal(card.id, month, upcoming) };
  });
  const max = Math.max(...months.map((m) => m.total), 1);
  const purchases = activePurchases(card.id, upcoming);

  return (
    <section className="space-y-4 rounded-3xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-10 place-items-center rounded-xl text-white",
              CATEGORY_COLORS[card.color]?.solid,
            )}
          >
            <CreditCardIcon className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">{card.name}</h2>
            <p className="text-xs text-muted-foreground">
              Cierra el {card.closingDay} · Vence el {card.dueDay}
            </p>
          </div>
        </div>
        <EditCardButton card={card} />
      </div>

      <div
        className={cn(
          "rounded-2xl p-3",
          daysLeft <= 2 ? "bg-rose-50 dark:bg-rose-500/10" : daysLeft <= 7 ? "bg-amber-50 dark:bg-amber-500/10" : "bg-muted",
        )}
      >
        <p className="text-xs text-muted-foreground">
          Próximo vencimiento: {formatShortDate(due)} (
          {daysLeft === 0 ? "hoy" : daysLeft === 1 ? "mañana" : `en ${daysLeft} días`})
        </p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums">{formatMoney(dueAmount)}</p>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-medium">Próximos resúmenes</h3>
        <ul className="space-y-1">
          {months.map(({ month, total }) => (
            <li key={month} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-xs">
              <span className="text-muted-foreground">{formatMonthShort(month)}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn("block h-full rounded-full", CATEGORY_COLORS[card.color]?.solid)}
                  style={{ width: `${(total / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-medium tabular-nums">{formatMoney(total)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-medium">Compras en cuotas</h3>
        {purchases.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sin cuotas pendientes. Carga una compra con el botón Gasto en el Resumen y elige esta tarjeta.
          </p>
        ) : (
          <ul className="divide-y rounded-2xl border">
            {purchases.map((p) => (
              <li key={p.purchaseId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.note || "Compra sin descripción"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.installments > 1
                      ? `Quedan ${p.remaining} de ${p.installments} cuotas de ${formatMoney(p.perInstallment)}`
                      : "Un pago"}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{formatMoney(p.remainingAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EmptyCards() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted">
        <CreditCardIcon className="size-7 text-muted-foreground" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Agrega tus tarjetas</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Con el día de cierre y de vencimiento repartimos tus compras en cuotas por mes y te avisamos
        cuando se acerca el vencimiento.
      </p>
      <NewCardButton className="mt-6 h-11" />
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 2 }, (_, i) => (
        <Skeleton key={i} className="h-80 rounded-3xl" />
      ))}
    </div>
  );
}
