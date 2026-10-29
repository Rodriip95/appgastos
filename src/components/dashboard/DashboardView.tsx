import Link from "next/link";
import { Sparkles } from "lucide-react";
import { CardsStrip } from "@/components/cards/CardsStrip";
import { DueReminders } from "@/components/cards/DueReminders";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { Breakdown } from "@/components/dashboard/Breakdown";
import { BudgetsCard } from "@/components/dashboard/BudgetsCard";
import { MonthSwitcher } from "@/components/dashboard/MonthSwitcher";
import { TransactionList } from "@/components/transactions/TransactionList";
import {
  RecurringSuggestions,
  QuickAddButton,
  TransactionSheetProvider,
} from "@/components/transactions/TransactionSheet";
import { upcomingDues } from "@/lib/finance/cards";
import { shiftMonth } from "@/lib/finance/format";
import {
  categoryUsage,
  pendingRecurring,
  projectMonthExpense,
  summarizeMonth,
} from "@/lib/finance/summary";
import type { Category, CreditCard, Transaction } from "@/lib/finance/types";

export type DashboardData = {
  categories: Category[];
  cards: CreditCard[];
  /** Movimientos del mes que se ve */
  transactions: Transaction[];
  /** Movimientos del mes anterior (comparación y fijos pendientes) */
  prevTransactions: Transaction[];
  /** Cuotas de tarjeta desde el mes en curso en adelante */
  upcomingCardTransactions: Transaction[];
  firstMonth: string | null;
};

type Props = DashboardData & {
  month: string;
  currentMonth: string;
  today: string;
  /** Categoría por la que se filtra la lista (?c=) */
  filterKey: string | null;
  /** "/" en la app, "/demo" en el modo demo */
  basePath: string;
  demo?: boolean;
};

/** Vista del mes. Sin acceso a datos: la usan la home real y /demo. */
export function DashboardView({
  categories,
  cards,
  transactions,
  prevTransactions,
  upcomingCardTransactions,
  firstMonth,
  month,
  currentMonth,
  today,
  filterKey,
  basePath,
  demo = false,
}: Props) {
  const summary = summarizeMonth(transactions, categories, prevTransactions);
  const prevSummary = summarizeMonth(prevTransactions, categories);
  const isCurrent = month === currentMonth;
  const dues = upcomingDues(cards, upcomingCardTransactions, today);
  const pending = isCurrent ? pendingRecurring(prevTransactions, transactions) : [];
  const usage = categoryUsage([...prevTransactions, ...transactions]);

  const monthQuery = month === currentMonth ? "" : `m=${month}`;
  const hrefWith = (params: string) => {
    const query = [monthQuery, params].filter(Boolean).join("&");
    return `${basePath}${query ? `?${query}` : ""}`;
  };

  return (
    <TransactionSheetProvider
      categories={categories}
      cards={cards}
      month={month}
      currentMonth={currentMonth}
      usage={usage}
      demo={demo}
    >
      <main className="space-y-5">
        {isCurrent && <DueReminders dues={dues} />}

        <MonthSwitcher
          month={month}
          currentMonth={currentMonth}
          firstMonth={firstMonth}
          basePath={basePath}
        />

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

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start">
          <div className="space-y-5">
            <BalanceCard
              summary={summary}
              previous={
                prevTransactions.length > 0
                  ? { income: prevSummary.income, expense: prevSummary.expense, month: shiftMonth(month, -1) }
                  : undefined
              }
              projection={projectMonthExpense(summary.expense, today, month)}
              incomeAction={<QuickAddButton type="income" />}
              expenseAction={<QuickAddButton type="expense" />}
            />
            <RecurringSuggestions pending={pending} categories={categories} />
            {isCurrent && <CardsStrip cards={cards} upcoming={upcomingCardTransactions} today={today} />}
            <BudgetsCard categories={categories} summary={summary} />
            {transactions.length > 0 && (
              <Breakdown summary={summary} filterHref={(key) => `${hrefWith(`c=${key}`)}#movimientos`} />
            )}
          </div>
          <TransactionList
            transactions={transactions}
            categories={categories}
            month={month}
            today={today}
            filterKey={filterKey}
            clearFilterHref={`${hrefWith("")}#movimientos`}
          />
        </div>
      </main>
    </TransactionSheetProvider>
  );
}
