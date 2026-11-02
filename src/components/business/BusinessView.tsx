"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Package, Pencil, Plus, ShoppingCart, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { CollapsibleList } from "@/components/common/CollapsibleList";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import {
  MaterialForm,
  OrderForm,
  PaymentForm,
  PurchaseForm,
} from "@/components/business/BusinessForms";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteMaterialPurchase,
  deleteOrderPayment,
  setOrderStatus,
} from "@/lib/actions/business";
import type { ActionResult } from "@/lib/finance/types";
import {
  businessBalance,
  isOpen,
  materialsCost,
  ORDER_STATUSES,
  orderBalance,
  PRIORITY_LABEL,
  sortOrders,
  STATUS_LABEL,
  stockValue,
  whatsappHref,
  type Material,
  type MaterialPurchase,
  type Order,
  type OrderPayment,
  type OrderStatus,
} from "@/lib/finance/business";
import { formatMoney, formatMonth, formatShortDate } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

type Props = {
  orders: Order[];
  materials: Material[];
  payments: OrderPayment[];
  purchases: MaterialPurchase[];
  today: string;
};

/** Módulo Emprendimiento. Los datos llegan de `(app)/emprendimiento/page.tsx`. */
export function BusinessView({ orders, materials, payments, purchases, today }: Props) {
  const [sheet, setSheet] = useState<
    | { kind: "order"; order?: Order }
    | { kind: "payment"; order: Order }
    | { kind: "material"; material?: Material }
    | { kind: "purchase"; material: Material }
    | null
  >(null);
  const close = () => setSheet(null);
  const ordered = sortOrders(orders);
  const open = ordered.filter(isOpen);
  const closed = ordered.filter((o) => !isOpen(o));
  const months = businessBalance(payments, purchases);
  const toCollect = open.reduce((sum, o) => sum + orderBalance(o), 0);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Emprendimiento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tus pedidos, materiales y números del negocio, aparte de tus gastos personales.
        </p>
      </div>

      <Tabs defaultValue="orders" className="gap-4">
        <TabsList className="w-full">
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="materials">Materiales</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {open.length} {open.length === 1 ? "abierto" : "abiertos"} · A cobrar {formatMoney(toCollect)}
            </p>
            <Button onClick={() => setSheet({ kind: "order" })}>
              <Plus /> Nuevo pedido
            </Button>
          </div>
          {orders.length === 0 && <Empty text="Todavía no tienes pedidos." />}
          {open.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              payments={payments.filter((p) => p.orderId === o.id)}
              today={today}
              onEdit={() => setSheet({ kind: "order", order: o })}
              onPay={() => setSheet({ kind: "payment", order: o })}
            />
          ))}
          {closed.length > 0 && (
            <>
              <h2 className="pt-2 text-sm font-medium text-muted-foreground">Entregados y cancelados</h2>
              <CollapsibleList limit={5} className="space-y-3">
                {closed.map((o) => (
                  <li key={o.id}>
                    <OrderCard
                      order={o}
                      payments={payments.filter((p) => p.orderId === o.id)}
                      today={today}
                      onEdit={() => setSheet({ kind: "order", order: o })}
                      onPay={() => setSheet({ kind: "payment", order: o })}
                    />
                  </li>
                ))}
              </CollapsibleList>
            </>
          )}
        </TabsContent>

        <TabsContent value="materials" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Valor del stock: {formatMoney(stockValue(materials))}</p>
            <Button onClick={() => setSheet({ kind: "material" })}>
              <Plus /> Nuevo material
            </Button>
          </div>
          {materials.length === 0 && <Empty text="Carga tus materiales para llevar el stock." />}
          {materials.length > 0 && (
            <ul className="divide-y rounded-3xl border bg-card">
              {materials.map((m) => (
                <li key={m.id} className="flex items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      <span className={cn(m.stock < 0 && "font-medium text-destructive")}>
                        {m.stock} {m.unit}
                      </span>{" "}
                      · {formatMoney(m.unitPrice)} c/u · {formatMoney(Math.max(0, m.stock) * m.unitPrice)}
                    </p>
                  </div>
                  <IconButton label={`Comprar ${m.name}`} onClick={() => setSheet({ kind: "purchase", material: m })}>
                    <ShoppingCart className="size-4" />
                  </IconButton>
                  <IconButton label={`Editar ${m.name}`} onClick={() => setSheet({ kind: "material", material: m })}>
                    <Pencil className="size-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
          {purchases.length > 0 && (
            <>
              <h2 className="pt-2 text-sm font-medium text-muted-foreground">Últimas compras</h2>
              <ul className="divide-y rounded-3xl border bg-card">
                {purchases.slice(0, 10).map((p) => (
                  <li key={p.id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {p.name} × {p.qty}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatShortDate(p.date)}</p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">−{formatMoney(p.total)}</span>
                    <UndoButton
                      label="Deshacer compra"
                      action={() => deleteMaterialPurchase(p.id)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </TabsContent>

        <TabsContent value="balance" className="space-y-3">
          {months.length === 0 && <Empty text="Cuando registres cobros o compras, aparecen acá." />}
          {months.map((m) => (
            <section key={m.month} className="rounded-3xl border bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">{formatMonth(m.month)}</h2>
                <p className={cn("text-lg font-semibold tabular-nums", m.balance < 0 && "text-destructive")}>
                  {formatMoney(m.balance)}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Cobros {formatMoney(m.income)} · Materiales {formatMoney(m.expense)}
              </p>
            </section>
          ))}
        </TabsContent>
      </Tabs>

      <ResponsiveSheet
        open={sheet !== null}
        onOpenChange={(o) => !o && close()}
        title={
          sheet?.kind === "order"
            ? sheet.order
              ? "Editar pedido"
              : "Nuevo pedido"
            : sheet?.kind === "payment"
              ? "Registrar pago"
              : sheet?.kind === "material"
                ? sheet.material
                  ? "Editar material"
                  : "Nuevo material"
                : sheet?.kind === "purchase"
                  ? `Comprar ${sheet.material.name}`
                  : "Emprendimiento"
        }
      >
        {sheet?.kind === "order" && <OrderForm order={sheet.order} materials={materials} onDone={close} />}
        {sheet?.kind === "payment" && <PaymentForm order={sheet.order} onDone={close} />}
        {sheet?.kind === "material" && <MaterialForm material={sheet.material} onDone={close} />}
        {sheet?.kind === "purchase" && <PurchaseForm material={sheet.material} onDone={close} />}
      </ResponsiveSheet>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <section className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
      <Package className="size-6 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </section>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function UndoButton({ label, action }: { label: string; action: () => Promise<ActionResult> }) {
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

const PRIORITY_CLASS = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-brand-orange/15 text-foreground",
  low: "bg-muted text-muted-foreground",
};

function OrderCard({
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
  const whatsapp = whatsappHref(order.phone);
  const balance = orderBalance(order);
  const cost = materialsCost(order);
  const late = isOpen(order) && order.deliveryDate < today;

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
            {isOpen(order) && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_CLASS[order.priority])}>
                {PRIORITY_LABEL[order.priority]}
              </span>
            )}
          </div>
          <p className={cn("text-xs text-muted-foreground", late && "font-medium text-destructive")}>
            {late ? "Atrasado: " : "Entrega: "}
            {formatShortDate(order.deliveryDate)}
          </p>
        </div>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            aria-label={`Escribir a ${order.client} por WhatsApp`}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="size-4" />
          </a>
        )}
        <IconButton label={`Editar pedido de ${order.client}`} onClick={onEdit}>
          <Pencil className="size-4" />
        </IconButton>
      </div>

      <p className="text-sm whitespace-pre-line">{order.detail}</p>

      {order.materials.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {order.materials.map((m) => `${m.name} × ${m.qty}`).join(", ")} · Costo {formatMoney(cost)} · Ganancia{" "}
          {formatMoney(order.amount - cost)}
        </p>
      )}

      <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
        <span className="font-semibold">{formatMoney(order.amount)}</span>
        <span className="text-muted-foreground">
          {balance > 0 ? `Saldo ${formatMoney(balance)}` : "Pagado"}
        </span>
      </div>

      {payments.length > 0 && (
        <ul className="space-y-1">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">
                {formatShortDate(p.date)}
                {p.note ? ` · ${p.note}` : ""}
                {p.transactionId ? " · En tu resumen" : ""}
              </span>
              <span className="tabular-nums">{formatMoney(p.amount)}</span>
              <UndoButton label="Deshacer pago" action={() => deleteOrderPayment(p.id)} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <select
          aria-label={`Estado del pedido de ${order.client}`}
          value={order.status}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value as OrderStatus)}
          className="h-9 min-w-0 flex-1 rounded-lg border bg-transparent px-2 text-sm"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {balance > 0 && order.status !== "cancelled" && (
          <Button variant="outline" onClick={onPay}>
            Registrar pago
          </Button>
        )}
      </div>
    </section>
  );
}
