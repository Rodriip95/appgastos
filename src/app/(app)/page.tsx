import { Suspense } from "react";
import { cookies } from "next/headers";
import { io } from "next/cache";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { verifySession } from "@/lib/auth/session";
import { getNearOrders } from "@/lib/data/business";
import { getCards } from "@/lib/data/cards";
import { getPaidStatements } from "@/lib/data/card-payments";
import { getCategories } from "@/lib/data/categories";
import { getGoals, getMonthGoalMovements, getRangeGoalMovements } from "@/lib/data/goals";
import { getUsdRate } from "@/lib/data/fx";
import { getSharedMonthSummary, getSharedRangeSummary } from "@/lib/data/shared-links";
import {
  getFirstActivityMonth,
  getFutureMonths,
  getMonthTransactions,
  getRangeTransactions,
  getUpcomingCardTransactions,
} from "@/lib/data/transactions";
import { fillRates } from "@/lib/finance/currency";
import { BALANCE_VIEW_COOKIE, resolveBalanceView, type BalanceView } from "@/lib/finance/balance-view";
import { isMonthKey, shiftMonth, todayKey } from "@/lib/finance/format";
import type { Transaction } from "@/lib/finance/types";

/** Mis movimientos y los de mi parte compartida, del más reciente al más antiguo. */
const newestFirst = (list: Transaction[]) =>
  list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  await verifySession();
  const params = await searchParams;
  const { m, c } = params;

  await io(); // "hoy" se calcula en cada request, no en el prerender
  const today = todayKey();
  const currentMonth = today.slice(0, 7);
  const saved = (await cookies()).get(BALANCE_VIEW_COOKIE)?.value;
  const view = resolveBalanceView(params, saved, today);
  const futureMonths = await getFutureMonths(currentMonth);
  // Meses pasados, el actual o uno próximo con movimientos; cualquier otro valor cae al mes actual.
  const month =
    isMonthKey(m) && (m <= currentMonth || futureMonths.includes(m)) ? m : currentMonth;

  const [
    categories,
    cards,
    transactions,
    prevTransactions,
    firstMonth,
    upcomingCardTransactions,
    goals,
    ownGoalMovements,
    shared,
    prevShared,
    range,
    nearOrders,
    usdRate,
    paidStatements,
  ] = await Promise.all([
    getCategories(),
    getCards(),
    getMonthTransactions(month),
    getMonthTransactions(shiftMonth(month, -1)),
    getFirstActivityMonth(),
    getUpcomingCardTransactions(currentMonth),
    getGoals(),
    getMonthGoalMovements(month),
    getSharedMonthSummary(month),
    getSharedMonthSummary(shiftMonth(month, -1)),
    getRange(view, today),
    getNearOrders(today),
    getUsdRate(),
    getPaidStatements(),
  ]);
  // Movimientos en dólares sin cotización guardada (la API no respondió al cargarlos): se usa la de hoy.
  const withRate = (list: Transaction[]) => fillRates(list, usdRate?.rate ?? null);
  const goalMovements = [...ownGoalMovements, ...shared.goalMovements];

  return (
    <DashboardView
      categories={categories}
      cards={cards}
      transactions={withRate(newestFirst([...transactions, ...shared.transactions]))}
      prevTransactions={withRate([...prevTransactions, ...prevShared.transactions])}
      upcomingCardTransactions={upcomingCardTransactions}
      firstMonth={firstMonth}
      nearOrders={nearOrders}
      futureMonths={futureMonths}
      goals={goals}
      goalMovements={goalMovements}
      month={month}
      currentMonth={currentMonth}
      today={today}
      filterKey={typeof c === "string" ? c : null}
      view={view}
      range={range && { ...range, transactions: withRate(range.transactions) }}
      usdRate={usdRate}
      paidStatements={paidStatements}
    />
  );
}

/** Movimientos de la vista general o de período; la vista mensual no los necesita. */
async function getRange(view: BalanceView, today: string) {
  if (view.kind === "month") return null;
  const [from, to] = view.kind === "period" ? [view.from, view.to] : [null, today];
  const [transactions, goalMovements, shared] = await Promise.all([
    getRangeTransactions(from, to),
    getRangeGoalMovements(from, to),
    getSharedRangeSummary(from, to),
  ]);
  return {
    transactions: newestFirst([...transactions, ...shared.transactions]),
    goalMovements: [...goalMovements, ...shared.goalMovements],
  };
}
