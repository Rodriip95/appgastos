import { Inbox } from "lucide-react";
import { TransactionRow } from "@/components/transactions/TransactionSheet";
import { formatDayLabel, formatMoney, formatMonthShort } from "@/lib/finance/format";
import type { Category, Transaction } from "@/lib/finance/types";

type Props = {
  transactions: Transaction[];
  categories: Category[];
  month: string;
  today: string;
};

export function TransactionList({ transactions, categories, month, today }: Props) {
  if (transactions.length === 0) {
    return (
      <section className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-muted">
          <Inbox className="size-6 text-muted-foreground" />
        </span>
        <h2 className="mt-3 font-semibold">Sin movimientos en {formatMonthShort(month)}</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Registra el primero con <strong className="font-medium text-foreground">Ingreso</strong> o{" "}
          <strong className="font-medium text-foreground">Gasto</strong>, debajo del balance.
        </p>
      </section>
    );
  }

  const byId = new Map(categories.map((c) => [c.id, c]));
  const days = new Map<string, Transaction[]>();
  for (const tx of transactions) days.set(tx.date, [...(days.get(tx.date) ?? []), tx]);

  return (
    <section className="space-y-4" aria-label="Movimientos">
      <h2 className="font-semibold">Movimientos</h2>
      {[...days].map(([date, items]) => {
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
                  <TransactionRow
                    transaction={tx}
                    category={(tx.categoryId && byId.get(tx.categoryId)) || null}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
