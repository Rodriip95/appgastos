import { Suspense } from "react";
import { io } from "next/cache";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { verifySession } from "@/lib/auth/session";
import { getCards } from "@/lib/data/cards";
import { getCategories } from "@/lib/data/categories";
import { getGoals, getMonthGoalMovements } from "@/lib/data/goals";
import { getSharedMonthSummary } from "@/lib/data/shared-links";
import {
  getFirstActivityMonth,
  getMonthTransactions,
  getUpcomingCardTransactions,
} from "@/lib/data/transactions";
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
  const { m, c } = await searchParams;

  await io(); // "hoy" se calcula en cada request, no en el prerender
  const today = todayKey();
  const currentMonth = today.slice(0, 7);
  // Solo meses pasados o el actual; cualquier otro valor cae al mes actual.
  const month = isMonthKey(m) && m <= currentMonth ? m : currentMonth;

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
  ]);
  const goalMovements = [...ownGoalMovements, ...shared.goalMovements];

  return (
    <DashboardView
      categories={categories}
      cards={cards}
      transactions={newestFirst([...transactions, ...shared.transactions])}
      prevTransactions={[...prevTransactions, ...prevShared.transactions]}
      upcomingCardTransactions={upcomingCardTransactions}
      firstMonth={firstMonth}
      goals={goals}
      goalMovements={goalMovements}
      month={month}
      currentMonth={currentMonth}
      today={today}
      filterKey={typeof c === "string" ? c : null}
    />
  );
}
