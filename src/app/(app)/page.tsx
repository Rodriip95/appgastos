import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CardsStrip } from "@/components/cards/CardsStrip";
import { DueReminders } from "@/components/cards/DueReminders";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { Breakdown } from "@/components/dashboard/Breakdown";
import { MonthSwitcher } from "@/components/dashboard/MonthSwitcher";
import { TransactionList } from "@/components/transactions/TransactionList";
import { QuickActions, TransactionSheetProvider } from "@/components/transactions/TransactionSheet";
import { verifySession } from "@/lib/auth/session";
import { getCards } from "@/lib/data/cards";
import { getCategories } from "@/lib/data/categories";
import {
  getFirstActivityMonth,
  getMonthTransactions,
  getUpcomingCardTransactions,
} from "@/lib/data/transactions";
import { upcomingDues } from "@/lib/finance/cards";
import { isMonthKey, todayKey } from "@/lib/finance/format";
import { summarizeMonth } from "@/lib/finance/summary";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  await verifySession();
  const { m } = await searchParams;

  await io(); // "hoy" se calcula en cada request, no en el prerender
  const today = todayKey();
  const currentMonth = today.slice(0, 7);
  // Solo meses pasados o el actual; cualquier otro valor cae al mes actual.
  const month = isMonthKey(m) && m <= currentMonth ? m : currentMonth;

  const [categories, cards, transactions, firstMonth, cardTransactions] = await Promise.all([
    getCategories(),
    getCards(),
    getMonthTransactions(month),
    getFirstActivityMonth(),
    getUpcomingCardTransactions(currentMonth),
  ]);
  const summary = summarizeMonth(transactions, categories);
  const dues = upcomingDues(cards, cardTransactions, today);

  return (
    <TransactionSheetProvider
      categories={categories}
      cards={cards}
      month={month}
      currentMonth={currentMonth}
    >
      <main className="space-y-5">
        <DueReminders dues={dues} />

        <MonthSwitcher month={month} currentMonth={currentMonth} firstMonth={firstMonth} />

        {categories.length === 0 && (
          <Link
            href="/categorias"
            className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <Sparkles className="size-5 shrink-0" />
            <span>
              <strong className="font-semibold">Configura tus categorías</strong> para saber en qué se va
              tu plata. Puedes empezar con las sugeridas.
            </span>
          </Link>
        )}

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start">
          <div className="space-y-5">
            <BalanceCard summary={summary} actions={<QuickActions />} />
            <CardsStrip cards={cards} upcoming={cardTransactions} today={today} />
            {transactions.length > 0 && <Breakdown summary={summary} />}
          </div>
          <TransactionList
            transactions={transactions}
            categories={categories}
            month={month}
            today={today}
          />
        </div>
      </main>
    </TransactionSheetProvider>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="size-11 rounded-full" />
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Skeleton className="h-56 rounded-3xl" />
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
