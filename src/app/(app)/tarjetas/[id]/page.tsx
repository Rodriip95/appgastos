import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, CreditCard as CreditCardIcon, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_COLORS } from "@/components/categories/CategoryIcon";
import { ConsumptionList, StatementPaidButton } from "@/components/cards/CardDetail";
import { getCards } from "@/lib/data/cards";
import { getCategories } from "@/lib/data/categories";
import { getPaidStatements } from "@/lib/data/card-payments";
import { getCardTransactions } from "@/lib/data/transactions";
import { dayInMonth, nextDueDate, statementKey, statementTotal } from "@/lib/finance/cards";
import { formatTotals } from "@/lib/finance/currency";
import { formatMonth, formatShortDate, isMonthKey, shiftMonth, todayKey } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Consumos de la tarjeta · Bingo" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function CardDetailPage({ params, searchParams }: Props) {
  return (
    <main className="space-y-5">
      <Link
        href="/tarjetas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tarjetas
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <CardDetail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function CardDetail({ params, searchParams }: Props) {
  const [{ id }, { m }] = await Promise.all([params, searchParams]);
  const [cards, categories, paidStatements] = await Promise.all([
    getCards(),
    getCategories(),
    getPaidStatements(),
  ]);
  const card = cards.find((c) => c.id === id);
  if (!card) notFound();
  const transactions = await getCardTransactions(card.id);

  await io(); // "hoy" se calcula en cada request
  const today = todayKey();
  const dueMonth = nextDueDate(card, today).slice(0, 7);
  // Se navega entre el primer y el último resumen con consumos (y siempre el próximo a vencer).
  const months = transactions.map((t) => t.month);
  const first = [dueMonth, ...months].sort()[0];
  const last = [dueMonth, ...months].sort().at(-1)!;
  const month = isMonthKey(m) && m >= first && m <= last ? m : dueMonth;
  const prev = month > first ? shiftMonth(month, -1) : null;
  const next = month < last ? shiftMonth(month, 1) : null;

  const items = transactions.filter((t) => t.month === month);
  const total = statementTotal(card.id, month, items);
  const paid = paidStatements.includes(statementKey(card.id, month));
  const due = dayInMonth(month, card.dueDay);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl text-white",
            CATEGORY_COLORS[card.color]?.solid,
          )}
        >
          <CreditCardIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{card.name}</h1>
          <p className="text-xs text-muted-foreground">
            Cierra el {card.closingDay} · Vence el {card.dueDay}
          </p>
        </div>
      </div>

      <nav aria-label="Cambiar resumen" className="flex items-center justify-between gap-2">
        <MonthLink cardId={card.id} month={prev} label="Resumen anterior">
          <ChevronLeft />
        </MonthLink>
        <div className="text-center">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {month === dueMonth ? "Próximo resumen" : month < dueMonth ? "Resumen anterior" : "Resumen futuro"}
          </p>
          <h2 className="text-xl font-semibold tracking-tight">{formatMonth(month)}</h2>
        </div>
        <MonthLink cardId={card.id} month={next} label="Resumen siguiente">
          <ChevronRight />
        </MonthLink>
      </nav>

      <section
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4",
          paid ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-muted",
        )}
      >
        <div>
          <p className="text-xs text-muted-foreground">
            Vence el {formatShortDate(due)} ·{" "}
            {paid ? "pagado, ya cuenta como gasto" : "sin pagar, todavía no cuenta como gasto"}
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">{formatTotals(total)}</p>
        </div>
        {(items.length > 0 || paid) && <StatementPaidButton cardId={card.id} month={month} paid={paid} />}
      </section>

      <section className="space-y-2" aria-label="Consumos">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="font-semibold">Consumos</h2>
          <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            <Inbox className="size-5" />
            No hay consumos en este resumen.
          </div>
        ) : (
          <>
            <ConsumptionList items={items} categories={categories} />
            <p className="px-1 text-center text-xs text-muted-foreground">
              Toca un consumo para ponerle un alias, corregir el monto o eliminarlo.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function MonthLink({
  cardId,
  month,
  label,
  children,
}: {
  cardId: string;
  month: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "grid size-11 place-items-center rounded-full border bg-card transition [&_svg]:size-5",
    month ? "hover:bg-muted active:scale-95" : "pointer-events-none opacity-30",
  );
  if (!month) {
    return (
      <span className={className} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={`/tarjetas/${cardId}?m=${month}`} className={className} aria-label={label} scroll={false}>
      {children}
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-12 w-56" />
      <Skeleton className="h-11 w-full rounded-full" />
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}
