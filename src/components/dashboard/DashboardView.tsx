import { BingoAssistant } from "@/components/brand/BingoAssistant";
import { CardsStrip } from "@/components/cards/CardsStrip";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { Breakdown } from "@/components/dashboard/Breakdown";
import { BudgetsCard } from "@/components/dashboard/BudgetsCard";
import { MonthSwitcher } from "@/components/dashboard/MonthSwitcher";
import { GoalsStrip } from "@/components/goals/GoalsStrip";
import { TransactionList } from "@/components/transactions/TransactionList";
import {
  RecurringSuggestions,
  QuickAddButton,
  TransactionSheetProvider,
} from "@/components/transactions/TransactionSheet";
import { bingoMessages } from "@/lib/finance/bingo";
import { upcomingDues } from "@/lib/finance/cards";
import { netSaved } from "@/lib/finance/goals";
import { shiftMonth } from "@/lib/finance/format";
import {
  categoryUsage,
  pendingRecurring,
  projectMonthExpense,
  summarizeMonth,
} from "@/lib/finance/summary";
import type { Category, CreditCard, Goal, GoalMovement, Transaction } from "@/lib/finance/types";

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
  goals: Goal[];
  /** Aportes y retiros de metas en el mes que se ve */
  goalMovements: GoalMovement[];
};

type Props = DashboardData & {
  month: string;
  currentMonth: string;
  today: string;
  /** Categoría por la que se filtra la lista (?c=) */
  filterKey: string | null;
};

/** Vista del mes. Solo presentación: los datos llegan de `(app)/page.tsx`. */
export function DashboardView({
  categories,
  cards,
  transactions,
  prevTransactions,
  upcomingCardTransactions,
  firstMonth,
  goals,
  goalMovements,
  month,
  currentMonth,
  today,
  filterKey,
}: Props) {
  const summary = summarizeMonth(transactions, categories, prevTransactions);
  const prevSummary = summarizeMonth(prevTransactions, categories);
  const isCurrent = month === currentMonth;
  const dues = upcomingDues(cards, upcomingCardTransactions, today);
  const pending = isCurrent ? pendingRecurring(prevTransactions, transactions) : [];
  const usage = categoryUsage([...prevTransactions, ...transactions]);
  const projection = projectMonthExpense(summary.expense, today, month);
  const assistant = isCurrent
    ? bingoMessages({
        today,
        month,
        summary,
        prevSummary,
        hasPrev: prevTransactions.length > 0,
        projection,
        categories,
        transactions,
        dues,
        pendingRecurring: pending,
        goals,
      })
    : [];

  const monthQuery = month === currentMonth ? "" : `m=${month}`;
  const hrefWith = (params: string) => {
    const query = [monthQuery, params].filter(Boolean).join("&");
    return `/${query ? `?${query}` : ""}`;
  };

  return (
    <TransactionSheetProvider
      categories={categories}
      cards={cards}
      month={month}
      currentMonth={currentMonth}
      usage={usage}
    >
      <main className="space-y-5">
        {assistant.length > 0 && <BingoAssistant messages={assistant} />}

        <MonthSwitcher
          month={month}
          currentMonth={currentMonth}
          firstMonth={firstMonth}
        />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start">
          <div className="space-y-5">
            <BalanceCard
              summary={summary}
              previous={
                prevTransactions.length > 0
                  ? { income: prevSummary.income, expense: prevSummary.expense, month: shiftMonth(month, -1) }
                  : undefined
              }
              projection={projection}
              saved={netSaved(goalMovements)}
              incomeAction={<QuickAddButton type="income" />}
              expenseAction={<QuickAddButton type="expense" />}
            />
            <RecurringSuggestions pending={pending} categories={categories} />
            {isCurrent && <CardsStrip cards={cards} upcoming={upcomingCardTransactions} today={today} />}
            {isCurrent && <GoalsStrip goals={goals} href="/ahorros" />}
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
