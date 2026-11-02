import { BingoAssistant } from "@/components/brand/BingoAssistant";
import { CardsStrip } from "@/components/cards/CardsStrip";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { Breakdown } from "@/components/dashboard/Breakdown";
import { BudgetsCard } from "@/components/dashboard/BudgetsCard";
import { BalanceViewSwitcher, PeriodPicker } from "@/components/dashboard/BalanceViewSwitcher";
import { MonthSwitcher } from "@/components/dashboard/MonthSwitcher";
import { GoalsStrip } from "@/components/goals/GoalsStrip";
import { TransactionList } from "@/components/transactions/TransactionList";
import {
  RecurringSuggestions,
  QuickAddButton,
  TransactionSheetProvider,
} from "@/components/transactions/TransactionSheet";
import { bingoMessages } from "@/lib/finance/bingo";
import { upcomingDeliveries, type Order } from "@/lib/finance/business";
import { countedTransactions, upcomingDues } from "@/lib/finance/cards";
import { netSaved } from "@/lib/finance/goals";
import { balanceViewQuery, type BalanceView } from "@/lib/finance/balance-view";
import { formatMonth, formatMonthShort, formatShortDate, shiftMonth } from "@/lib/finance/format";
import {
  categoryUsage,
  pendingRecurring,
  projectMonthExpense,
  summarizeMonth,
} from "@/lib/finance/summary";
import type { UsdRate } from "@/lib/finance/currency";
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
  /** Pedidos del emprendimiento con entrega cercana */
  nearOrders: Order[];
  /** Meses posteriores al actual con movimientos */
  futureMonths: string[];
  goals: Goal[];
  /** Aportes y retiros de metas en el mes que se ve */
  goalMovements: GoalMovement[];
  /** Resúmenes de tarjeta pagados (`cardId:YYYY-MM`); solo esos cuentan como gasto */
  paidStatements: string[];
};

type Props = DashboardData & {
  month: string;
  currentMonth: string;
  today: string;
  /** Categoría por la que se filtra la lista (?c=) */
  filterKey: string | null;
  view: BalanceView;
  /** Lo que muestra la vista general o de período; null en la vista mensual */
  range: { transactions: Transaction[]; goalMovements: GoalMovement[] } | null;
  /** Cotización de hoy del dólar de referencia (null si la API no respondió) */
  usdRate: UsdRate | null;
};

/** Vista del mes. Solo presentación: los datos llegan de `(app)/page.tsx`. */
export function DashboardView({
  categories,
  cards,
  transactions,
  prevTransactions,
  upcomingCardTransactions,
  firstMonth,
  nearOrders,
  futureMonths,
  goals,
  goalMovements,
  month,
  currentMonth,
  today,
  filterKey,
  view,
  range,
  usdRate,
  paidStatements,
}: Props) {
  // Las cuotas de un resumen sin pagar todavía no son gasto: se ven en la lista, pero no suman.
  const counted = (list: Transaction[]) => countedTransactions(list, cards, paidStatements);
  const monthCounted = counted(transactions);
  const prevCounted = counted(prevTransactions);
  const summary = summarizeMonth(monthCounted, categories, prevCounted);
  const prevSummary = summarizeMonth(prevCounted, categories);
  const isCurrent = month === currentMonth;
  const dues = upcomingDues(cards, upcomingCardTransactions, today, 7, paidStatements);
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
        transactions: monthCounted,
        dues,
        pendingRecurring: pending,
        goals,
        deliveries: upcomingDeliveries(nearOrders, today),
      })
    : [];

  // En general y período se reemplaza solo lo que se ve; el asistente sigue mirando el mes.
  const shown = range?.transactions ?? transactions;
  const shownCounted = range ? counted(range.transactions) : monthCounted;
  const shownSummary = range ? summarizeMonth(shownCounted, categories) : summary;
  // En "¿En qué se fue?" cada tarjeta va en una sola fila, con sus consumos adentro.
  const breakdownSummary = summarizeMonth(shownCounted, categories, range ? [] : prevCounted, {
    groupCards: cards,
  });
  const cardHref = (cardId: string) =>
    `/tarjetas/${cardId}${view.kind === "month" ? `?m=${month}` : ""}`;
  const scopeLabel =
    view.kind === "general"
      ? "tu historial"
      : view.kind === "period"
        ? "este período"
        : formatMonthShort(month);

  const viewQuery =
    view.kind === "month" && month !== currentMonth ? `m=${month}` : balanceViewQuery(view);
  const hrefWith = (params: string) => {
    const query = [viewQuery, params].filter(Boolean).join("&");
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

        <BalanceViewSwitcher view={view} today={today} />

        {view.kind === "month" && (
          <MonthSwitcher
            month={month}
            currentMonth={currentMonth}
            firstMonth={firstMonth}
            futureMonths={futureMonths}
          />
        )}
        {view.kind === "general" && (
          <div className="text-center">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Balance general
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              {firstMonth ? `Desde ${formatMonth(firstMonth)}` : "Desde hoy"}
            </h1>
          </div>
        )}
        {view.kind === "period" && (
          <div className="space-y-3">
            <h1 className="text-center text-xl font-semibold tracking-tight">
              {formatShortDate(view.from)} al {formatShortDate(view.to)}
            </h1>
            <PeriodPicker from={view.from} to={view.to} today={today} />
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start">
          <div className="space-y-5">
            <BalanceCard
              label={view.kind === "general" ? "Balance general" : view.kind === "period" ? "Balance del período" : undefined}
              summary={shownSummary}
              previous={
                !range && prevTransactions.length > 0
                  ? { ...prevSummary.ars, month: shiftMonth(month, -1) }
                  : undefined
              }
              usdRate={usdRate}
              projection={range ? null : projection}
              saved={netSaved(range?.goalMovements ?? goalMovements)}
              incomeAction={<QuickAddButton type="income" />}
              expenseAction={<QuickAddButton type="expense" />}
            />
            <RecurringSuggestions pending={pending} categories={categories} />
            {isCurrent && (
              <CardsStrip
                cards={cards}
                upcoming={upcomingCardTransactions}
                today={today}
                paidStatements={paidStatements}
              />
            )}
            {isCurrent && <GoalsStrip goals={goals} href="/ahorros" />}
            {!range && <BudgetsCard categories={categories} summary={summary} />}
            {shown.length > 0 && (
              <Breakdown
                summary={breakdownSummary}
                filterHref={(key) => `${hrefWith(`c=${key}`)}#movimientos`}
                cardHref={cardHref}
              />
            )}
          </div>
          <TransactionList
            transactions={shown}
            categories={categories}
            cards={cards}
            paidStatements={paidStatements}
            scopeLabel={scopeLabel}
            today={today}
            filterKey={filterKey}
            clearFilterHref={`${hrefWith("")}#movimientos`}
          />
        </div>
      </main>
    </TransactionSheetProvider>
  );
}
