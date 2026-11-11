"use client";

import { useTransition, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, MessageCircle, Package, Pencil, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { BalanceViewSwitcher, PeriodPicker } from "@/components/dashboard/BalanceViewSwitcher";
import { MonthSwitcher } from "@/components/dashboard/MonthSwitcher";
import { Button } from "@/components/ui/button";
import { deleteOrderPayment, setOrderStatus } from "@/lib/actions/business";
import type { BalanceView } from "@/lib/finance/balance-view";
import {
  isOpen,
  materialsCost,
  ORDER_STATUSES,
  orderBalance,
  orderMargin,
  orderTitle,
  PRIORITY_LABEL,
  statusLabel,
  timeRange,
  whatsappHref,
  type BusinessData,
  type BusinessMetrics,
  type Order,
  type OrderPayment,
  type OrderStatus,
} from "@/lib/finance/business";
import { formatMoney, formatMonth, formatMonthShort, formatShortDate, todayKey } from "@/lib/finance/format";
import { changePct } from "@/lib/finance/summary";
import type { ActionResult } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

/** Encabezado de una sección de Mi negocio: volver, título y acciones (abren el modal). */
export function SubpageHeader({
  title,
  description,
  query,
  children,
}: {
  title: string;
  description?: string;
  /** Vista de balance elegida (sin `?`), para volver a la misma */
  query: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <Link
        href={query ? `/negocio?${query}` : "/negocio"}
        className="-ml-1 inline-flex items-center gap-0.5 rounded-full py-1 pr-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Mi negocio
      </Link>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children && <div className="flex shrink-0 gap-2">{children}</div>}
      </div>
    </div>
  );
}

/** Mes / Período / General y el selector que corresponde, igual que en la home. */
export function PeriodHeader({
  data,
  view,
  month,
  today,
  basePath,
}: {
  data: Pick<BusinessData, "payments" | "purchases" | "expenses">;
  view: BalanceView;
  month: string;
  today: string;
  basePath: string;
}) {
  const firstMonth =
    [...data.payments, ...data.purchases, ...data.expenses].map((x) => x.month).sort()[0] ?? null;
  return (
    <div className="space-y-3">
      <BalanceViewSwitcher view={view} today={today} basePath={basePath} />
      {view.kind === "month" && (
        <MonthSwitcher
          month={month}
          currentMonth={today.slice(0, 7)}
          firstMonth={firstMonth}
          futureMonths={[]}
          basePath={basePath}
        />
      )}
      {view.kind === "general" && (
        <div className="text-center">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Desde el principio</p>
          <h2 className="text-xl font-semibold tracking-tight">
            {firstMonth ? `Desde ${formatMonth(firstMonth)}` : "Todavía sin movimientos"}
          </h2>
        </div>
      )}
      {view.kind === "period" && (
        <div className="space-y-3">
          <h2 className="text-center text-xl font-semibold tracking-tight">
            {formatShortDate(view.from)} al {formatShortDate(view.to)}
          </h2>
          <PeriodPicker from={view.from} to={view.to} today={today} basePath={basePath} />
        </div>
      )}
    </div>
  );
}

export function ProfitCard({
  metrics,
  prev,
  prevMonth,
}: {
  metrics: BusinessMetrics;
  prev: BusinessMetrics | null;
  prevMonth: string;
}) {
  const change = prev && (prev.income > 0 || prev.expense > 0) ? changePct(metrics.profit, prev.profit) : null;
  return (
    <section className="rounded-3xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">Ganancia</p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className={cn("text-3xl font-semibold tracking-tight tabular-nums", metrics.profit < 0 && "text-destructive")}>
          {formatMoney(metrics.profit)}
        </p>
        {metrics.margin !== null && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
            {metrics.margin}% de lo cobrado
          </span>
        )}
      </div>
      {prev && (
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {change !== null
            ? `${change > 0 ? "+" : ""}${change}% vs ${formatMonthShort(prevMonth)} (${formatMoney(prev.profit)})`
            : `${formatMonthShort(prevMonth)}: ${formatMoney(prev.profit)}`}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Cobraste</p>
          <p className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
            {formatMoney(metrics.income)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gastaste</p>
          <p className="font-semibold tabular-nums">{formatMoney(metrics.expense)}</p>
        </div>
      </div>
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <section className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
      <Package className="size-6 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </section>
  );
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

export function WhatsAppLink({ phone, name }: { phone: string; name: string }) {
  const href = whatsappHref(phone);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Escribir a ${name} por WhatsApp`}
      className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <MessageCircle className="size-4" />
    </a>
  );
}

export function UndoButton({ label, action }: { label: string; action: () => Promise<ActionResult> }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={label}
      title={label}
      onClick={() =>
        startTransition(async () => {
          const res = await action();
          if (!res.ok) toast.error(res.error);
        })
      }
      className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted disabled:opacity-50"
    >
      <Undo2 className="size-3.5" />
    </button>
  );
}

/** Fecha (YYYY-MM-DD) de un timestamp, en la zona horaria de la app. */
const createdKey = (millis: number) => todayKey(new Date(millis));

const PRIORITY_CLASS = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-brand-orange/15 text-foreground",
  low: "bg-muted text-muted-foreground",
};

export function OrderCard({
  order,
  payments,
  today,
  onEdit,
  onPay,
}: {
  order: Order;
  payments: OrderPayment[];
  today: string;
  onEdit: () => void;
  onPay: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const balance = orderBalance(order);
  const cost = materialsCost(order);
  const turn = order.kind === "appointment";
  const late = isOpen(order) && order.deliveryDate < today;
  const hours = timeRange(order);

  function changeStatus(status: OrderStatus) {
    startTransition(async () => {
      const res = await setOrderStatus(order.id, status);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <section className="space-y-3 rounded-3xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{order.client}</h3>
            {turn && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Turno</span>
            )}
            {!turn && isOpen(order) && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_CLASS[order.priority])}>
                {PRIORITY_LABEL[order.priority]}
              </span>
            )}
          </div>
          <p className={cn("text-xs text-muted-foreground", late && "font-medium text-destructive")}>
            {turn
              ? `${late ? "Quedó abierto: " : "Turno: "}${formatShortDate(order.deliveryDate)}${hours ? ` · ${hours}` : ""}`
              : `${late ? "Atrasado: " : "Entrega: "}${formatShortDate(order.deliveryDate)}`}
            {order.createdAt > 0 && ` · Tomado el ${formatShortDate(createdKey(order.createdAt))}`}
          </p>
        </div>
        <WhatsAppLink phone={order.phone} name={order.client} />
        <IconButton label={`Editar ${turn ? "turno" : "pedido"} de ${order.client}`} onClick={onEdit}>
          <Pencil className="size-4" />
        </IconButton>
      </div>

      {turn && order.services.length > 0 && <p className="text-sm font-medium">{orderTitle(order)}</p>}
      {order.detail && !(turn && order.detail === orderTitle(order)) && (
        <p className="text-sm whitespace-pre-line">{order.detail}</p>
      )}

      {order.materials.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {order.materials.map((m) => `${m.name} × ${m.qty}`).join(", ")} · Costo {formatMoney(cost)} · Te deja{" "}
          {formatMoney(order.amount - cost)} ({orderMargin(order)}%)
        </p>
      )}

      <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
        <span className="font-semibold">{formatMoney(order.amount)}</span>
        <span className="text-muted-foreground">{balance > 0 ? `Saldo ${formatMoney(balance)}` : "Pagado"}</span>
      </div>

      {payments.length > 0 && (
        <ul className="space-y-1">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">
                {formatShortDate(p.date)}
                {p.note ? ` · ${p.note}` : ""}
              </span>
              <span className="tabular-nums">{formatMoney(p.amount)}</span>
              <UndoButton label="Deshacer pago" action={() => deleteOrderPayment(p.id)} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <select
          aria-label={`Estado del ${turn ? "turno" : "pedido"} de ${order.client}`}
          value={order.status}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value as OrderStatus)}
          className="h-9 min-w-0 flex-1 rounded-lg border bg-transparent px-2 text-sm"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel({ kind: order.kind, status: s })}
            </option>
          ))}
        </select>
        {balance > 0 && order.status !== "cancelled" && (
          <Button variant="outline" onClick={onPay}>
            {turn ? "Cobrar" : "Registrar pago"}
          </Button>
        )}
      </div>
    </section>
  );
}
