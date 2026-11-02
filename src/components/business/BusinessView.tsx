"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Receipt,
  Settings2,
  ShoppingCart,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { CollapsibleList } from "@/components/common/CollapsibleList";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import {
  ClientForm,
  ExpenseForm,
  MaterialForm,
  OrderForm,
  PaymentForm,
  PurchaseForm,
  SettingsForm,
} from "@/components/business/BusinessForms";
import { BalanceViewSwitcher, PeriodPicker } from "@/components/dashboard/BalanceViewSwitcher";
import { MonthSwitcher } from "@/components/dashboard/MonthSwitcher";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteMaterialPurchase,
  deleteOrderPayment,
  setOrderStatus,
} from "@/lib/actions/business";
import type { BalanceView } from "@/lib/finance/balance-view";
import {
  BUSINESS_TABS,
  businessMetrics,
  clientStats,
  CONCEPT_LABEL,
  isLowStock,
  isOpen,
  materialsCost,
  ORDER_STATUSES,
  orderBalance,
  orderMargin,
  PRIORITY_LABEL,
  sortOrders,
  STATUS_LABEL,
  stockValue,
  whatsappHref,
  type BusinessData,
  type BusinessExpense,
  type BusinessTab,
  type BusinessMetrics,
  type BusinessSettings,
  type Client,
  type DateRange,
  type Material,
  type Order,
  type OrderPayment,
  type OrderStatus,
} from "@/lib/finance/business";
import { formatMoney, formatMonth, formatMonthShort, formatShortDate, shiftMonth } from "@/lib/finance/format";
import { changePct } from "@/lib/finance/summary";
import type { ActionResult } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const TAB_LABEL: Record<BusinessTab, string> = {
  resumen: "Resumen",
  pedidos: "Pedidos",
  clientes: "Clientes",
  stock: "Stock",
  gastos: "Gastos",
};

type Props = BusinessData & {
  settings: BusinessSettings;
  today: string;
  /** Mes que se ve en la vista mensual */
  month: string;
  view: BalanceView;
  /** Fechas que abarca la vista elegida */
  range: DateRange;
  initialTab: BusinessTab;
};

type Sheet =
  | { kind: "order"; order?: Order; client?: Client }
  | { kind: "payment"; order: Order }
  | { kind: "material"; material?: Material }
  | { kind: "purchase"; material: Material }
  | { kind: "client"; client?: Client }
  | { kind: "expense"; expense?: BusinessExpense }
  | { kind: "settings" };

const SHEET_TITLE: Record<Sheet["kind"], string> = {
  order: "Pedido",
  payment: "Registrar pago",
  material: "Material",
  purchase: "Compra",
  client: "Cliente",
  expense: "Gasto del negocio",
  settings: "Precios",
};

/** Mi negocio. Los datos llegan de `(app)/negocio/page.tsx`. */
export function BusinessView(props: Props) {
  const { orders, materials, payments, purchases, expenses, clients, settings, today, month, view, range } = props;
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [tab, setTab] = useState<BusinessTab>(props.initialTab);
  const close = () => setSheet(null);
  const currentMonth = today.slice(0, 7);

  const metrics = businessMetrics(props, range);
  const prevMonth = shiftMonth(month, -1);
  const prevMetrics =
    view.kind === "month" ? businessMetrics(props, { from: `${prevMonth}-01`, to: `${prevMonth}-31` }) : null;
  const firstMonth =
    [...payments.map((p) => p.month), ...purchases.map((p) => p.month), ...expenses.map((e) => e.month)].sort()[0] ??
    null;
  // Proveedores ya usados, para sugerirlos al cargar compras y gastos.
  const suppliers = [...new Set([...purchases, ...expenses].map((x) => x.supplier).filter(Boolean))].sort();

  return (
    <main className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mi negocio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lo que cobras y gastas acá también suma en tu balance general.
          </p>
        </div>
        <IconButton label="Margen y precios" onClick={() => setSheet({ kind: "settings" })}>
          <Settings2 className="size-4" />
        </IconButton>
      </div>

      <BalanceViewSwitcher view={view} today={today} basePath="/negocio" />
      {view.kind === "month" && (
        <MonthSwitcher
          month={month}
          currentMonth={currentMonth}
          firstMonth={firstMonth}
          futureMonths={[]}
          basePath="/negocio"
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
          <PeriodPicker from={view.from} to={view.to} today={today} basePath="/negocio" />
        </div>
      )}

      <ProfitCard metrics={metrics} prev={prevMetrics} prevMonth={prevMonth} />

      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" onClick={() => setSheet({ kind: "order" })}>
          <Plus /> Nuevo pedido
        </Button>
        <Button size="lg" variant="outline" onClick={() => setSheet({ kind: "expense" })}>
          <Receipt /> Registrar gasto
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as BusinessTab)} className="gap-4">
        <TabsList className="w-full">
          {BUSINESS_TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="px-1 text-xs sm:text-sm">
              {TAB_LABEL[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumen" className="min-w-0 space-y-4">
          <SummaryTab
            metrics={metrics}
            data={props}
            month={view.kind === "month" ? month : range.to.slice(0, 7)}
            stockTotal={stockValue(materials)}
            lowStock={materials.filter(isLowStock)}
            onStock={() => setTab("stock")}
          />
        </TabsContent>

        <TabsContent value="pedidos" className="min-w-0 space-y-3">
          <OrdersTab
            orders={orders}
            payments={payments}
            today={today}
            onEdit={(order) => setSheet({ kind: "order", order })}
            onPay={(order) => setSheet({ kind: "payment", order })}
          />
        </TabsContent>

        <TabsContent value="clientes" className="min-w-0 space-y-3">
          <ClientsTab
            clients={clients}
            orders={orders}
            onAdd={() => setSheet({ kind: "client" })}
            onEdit={(client) => setSheet({ kind: "client", client })}
            onOrder={(client) => setSheet({ kind: "order", client })}
          />
        </TabsContent>

        <TabsContent value="stock" className="min-w-0 space-y-3">
          <StockTab
            materials={materials}
            purchases={purchases}
            onAdd={() => setSheet({ kind: "material" })}
            onEdit={(material) => setSheet({ kind: "material", material })}
            onBuy={(material) => setSheet({ kind: "purchase", material })}
          />
        </TabsContent>

        <TabsContent value="gastos" className="min-w-0 space-y-3">
          <ExpensesTab
            metrics={metrics}
            purchases={purchases.filter((p) => inRange(p.date, range))}
            expenses={expenses.filter((e) => inRange(e.date, range))}
            onEdit={(expense) => setSheet({ kind: "expense", expense })}
          />
        </TabsContent>
      </Tabs>

      <ResponsiveSheet
        open={sheet !== null}
        onOpenChange={(o) => !o && close()}
        title={sheetTitle(sheet)}
      >
        {sheet?.kind === "order" && (
          <OrderForm
            order={sheet.order}
            presetClient={sheet.client}
            materials={materials}
            clients={clients}
            targetMargin={settings.targetMargin}
            onDone={close}
          />
        )}
        {sheet?.kind === "payment" && <PaymentForm order={sheet.order} onDone={close} />}
        {sheet?.kind === "material" && <MaterialForm material={sheet.material} onDone={close} />}
        {sheet?.kind === "purchase" && (
          <PurchaseForm material={sheet.material} suppliers={suppliers} onDone={close} />
        )}
        {sheet?.kind === "client" && <ClientForm client={sheet.client} onDone={close} />}
        {sheet?.kind === "expense" && (
          <ExpenseForm expense={sheet.expense} suppliers={suppliers} onDone={close} />
        )}
        {sheet?.kind === "settings" && <SettingsForm targetMargin={settings.targetMargin} onDone={close} />}
      </ResponsiveSheet>
    </main>
  );
}

const inRange = (date: string, { from, to }: DateRange) => (!from || date >= from) && date <= to;

function sheetTitle(sheet: Sheet | null): string {
  if (!sheet) return "Mi negocio";
  switch (sheet.kind) {
    case "order":
      return sheet.order ? "Editar pedido" : "Nuevo pedido";
    case "material":
      return sheet.material ? "Editar material" : "Nuevo material";
    case "purchase":
      return `Comprar ${sheet.material.name}`;
    case "client":
      return sheet.client ? "Editar cliente" : "Nuevo cliente";
    case "expense":
      return sheet.expense ? "Editar gasto" : "Gasto del negocio";
    default:
      return SHEET_TITLE[sheet.kind];
  }
}

function ProfitCard({
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
        <p
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums",
            metrics.profit < 0 && "text-destructive",
          )}
        >
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SummaryTab({
  metrics,
  data,
  month,
  stockTotal,
  lowStock,
  onStock,
}: {
  metrics: BusinessMetrics;
  data: BusinessData;
  /** Último mes del gráfico de meses */
  month: string;
  stockTotal: number;
  lowStock: Material[];
  onStock: () => void;
}) {
  // Últimos 6 meses hasta el que se ve, sin los vacíos del principio.
  const all = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map((m) => ({
    month: m,
    ...businessMetrics(data, { from: `${m}-01`, to: `${m}-31` }),
  }));
  const firstActive = all.findIndex((m) => m.income > 0 || m.expense > 0);
  const months = firstActive === -1 ? [] : all.slice(firstActive);
  const maxAbs = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const maxConcept = Math.max(1, ...metrics.byConcept.map((c) => c.total));

  return (
    <>
      {lowStock.length > 0 && (
        <button
          type="button"
          onClick={onStock}
          className="flex w-full items-center gap-3 rounded-2xl border border-brand-orange/40 bg-brand-orange/10 p-3 text-left text-sm"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Poco stock de {lowStock.map((m) => m.name).join(", ")}
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Pedidos entregados" value={String(metrics.delivered)} />
        <Stat label="Ticket promedio" value={metrics.avgTicket !== null ? formatMoney(metrics.avgTicket) : "—"} />
        <Stat
          label="Margen por pedido"
          value={metrics.avgOrderMargin !== null ? `${metrics.avgOrderMargin}%` : "—"}
          hint="Precio menos materiales"
        />
        <Stat label="Por cobrar" value={formatMoney(metrics.toCollect)} hint="Saldos de pedidos" />
        <Stat label="Valor del stock" value={formatMoney(stockTotal)} />
        <Stat label="Clientes" value={String(data.clients.length)} />
      </div>

      {months.length > 0 && (
        <section className="rounded-3xl border bg-card p-4">
          <h2 className="font-semibold">Mes a mes</h2>
          <ul className="mt-3 space-y-3">
            {months.map((m) => (
              <li key={m.month} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{formatMonthShort(m.month)}</span>
                  <span className={cn("font-medium tabular-nums", m.profit < 0 && "text-destructive")}>
                    {formatMoney(m.profit)}
                  </span>
                </div>
                <div className="space-y-0.5" aria-hidden>
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(m.income / maxAbs) * 100}%` }} />
                  <div
                    className="h-1.5 rounded-full bg-muted-foreground/40"
                    style={{ width: `${(m.expense / maxAbs) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" /> Cobrado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted-foreground/40" /> Gastado
            </span>
          </p>
        </section>
      )}

      {metrics.byConcept.length > 0 && (
        <section className="rounded-3xl border bg-card p-4">
          <h2 className="font-semibold">En qué se gasta</h2>
          <ul className="mt-3 space-y-2.5">
            {metrics.byConcept.map((c) => (
              <li key={c.key} className="space-y-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span>{c.label}</span>
                  <span className="tabular-nums">{formatMoney(c.total)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(c.total / maxConcept) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {metrics.topClients.length > 0 && (
        <section className="rounded-3xl border bg-card p-4">
          <h2 className="font-semibold">Mejores clientes</h2>
          <ul className="mt-2 divide-y">
            {metrics.topClients.map((c) => (
              <li key={c.name} className="flex items-baseline justify-between gap-2 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {c.name}
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    · {c.orders} {c.orders === 1 ? "pedido" : "pedidos"}
                  </span>
                </span>
                <span className="font-medium tabular-nums">{formatMoney(c.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function OrdersTab({
  orders,
  payments,
  today,
  onEdit,
  onPay,
}: {
  orders: Order[];
  payments: OrderPayment[];
  today: string;
  onEdit: (order: Order) => void;
  onPay: (order: Order) => void;
}) {
  const ordered = sortOrders(orders);
  const open = ordered.filter(isOpen);
  const closed = ordered.filter((o) => !isOpen(o));
  const toCollect = open.reduce((sum, o) => sum + orderBalance(o), 0);
  const card = (o: Order) => (
    <OrderCard
      order={o}
      payments={payments.filter((p) => p.orderId === o.id)}
      today={today}
      onEdit={() => onEdit(o)}
      onPay={() => onPay(o)}
    />
  );

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {open.length} {open.length === 1 ? "abierto" : "abiertos"} · A cobrar {formatMoney(toCollect)}
      </p>
      {orders.length === 0 && <Empty text="Todavía no tienes pedidos." />}
      {open.map((o) => (
        <div key={o.id}>{card(o)}</div>
      ))}
      {closed.length > 0 && (
        <>
          <h2 className="pt-2 text-sm font-medium text-muted-foreground">Entregados y cancelados</h2>
          <CollapsibleList limit={5} className="space-y-3">
            {closed.map((o) => (
              <li key={o.id}>{card(o)}</li>
            ))}
          </CollapsibleList>
        </>
      )}
    </>
  );
}

function ClientsTab({
  clients,
  orders,
  onAdd,
  onEdit,
  onOrder,
}: {
  clients: Client[];
  orders: Order[];
  onAdd: () => void;
  onEdit: (client: Client) => void;
  onOrder: (client: Client) => void;
}) {
  const [query, setQuery] = useState("");
  const stats = clientStats(orders);
  const q = query.trim().toLowerCase();
  const shown = clients
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q))
    .sort((a, b) => (stats.get(b.id)?.paid ?? 0) - (stats.get(a.id)?.paid ?? 0) || a.name.localeCompare(b.name));

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente"
          aria-label="Buscar cliente"
          className="h-10 min-w-0 flex-1 rounded-xl border bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm"
        />
        <Button onClick={onAdd}>
          <Plus /> Cliente
        </Button>
      </div>
      {clients.length === 0 && <Empty text="Tus clientes aparecen acá al cargar pedidos, o agrégalos a mano." />}
      {shown.length > 0 && (
        <CollapsibleList limit={15} className="divide-y rounded-3xl border bg-card">
          {shown.map((c) => {
            const s = stats.get(c.id);
            const whatsapp = whatsappHref(c.phone);
            return (
              <li key={c.id} className="flex items-center gap-2 px-4 py-3">
                <button type="button" onClick={() => onEdit(c)} className="min-w-0 flex-1 overflow-hidden text-left">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground tabular-nums">
                    {s
                      ? [
                          `${s.orders} ${s.orders === 1 ? "pedido" : "pedidos"}`,
                          `pagó ${formatMoney(s.paid)}`,
                          s.owes > 0 ? `debe ${formatMoney(s.owes)}` : null,
                          s.lastOrder ? `último ${formatShortDate(s.lastOrder)}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : c.note || "Sin pedidos todavía"}
                  </p>
                </button>
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Escribir a ${c.name} por WhatsApp`}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <MessageCircle className="size-4" />
                  </a>
                )}
                <IconButton label={`Nuevo pedido de ${c.name}`} onClick={() => onOrder(c)}>
                  <Plus className="size-4" />
                </IconButton>
              </li>
            );
          })}
        </CollapsibleList>
      )}
    </>
  );
}

function StockTab({
  materials,
  purchases,
  onAdd,
  onEdit,
  onBuy,
}: {
  materials: Material[];
  purchases: BusinessData["purchases"];
  onAdd: () => void;
  onEdit: (material: Material) => void;
  onBuy: (material: Material) => void;
}) {
  // Primero lo que hay que reponer.
  const sorted = [...materials].sort((a, b) => Number(isLowStock(b)) - Number(isLowStock(a)));
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Valor del stock: {formatMoney(stockValue(materials))}</p>
        <Button onClick={onAdd}>
          <Plus /> Material
        </Button>
      </div>
      {materials.length === 0 && <Empty text="Carga tus materiales para llevar el stock." />}
      {materials.length > 0 && (
        <ul className="divide-y rounded-3xl border bg-card">
          {sorted.map((m) => {
            const low = isLowStock(m);
            return (
              <li key={m.id} className="flex items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <span className="truncate">{m.name}</span>
                    {low && (
                      <span className="shrink-0 rounded-full bg-brand-orange/15 px-2 py-0.5 text-[11px] font-medium">
                        Reponer
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    <span className={cn((m.stock < 0 || low) && "font-medium text-destructive")}>
                      {m.stock} {m.unit}
                    </span>{" "}
                    · {formatMoney(m.unitPrice)} c/u · {formatMoney(Math.max(0, m.stock) * m.unitPrice)}
                  </p>
                </div>
                <IconButton label={`Comprar ${m.name}`} onClick={() => onBuy(m)}>
                  <ShoppingCart className="size-4" />
                </IconButton>
                <IconButton label={`Editar ${m.name}`} onClick={() => onEdit(m)}>
                  <Pencil className="size-4" />
                </IconButton>
              </li>
            );
          })}
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
                  <p className="truncate text-xs text-muted-foreground">
                    {formatShortDate(p.date)}
                    {p.supplier ? ` · ${p.supplier}` : ""} · {formatMoney(p.total / p.qty)} c/u
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">−{formatMoney(p.total)}</span>
                <UndoButton label="Deshacer compra" action={() => deleteMaterialPurchase(p.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function ExpensesTab({
  metrics,
  purchases,
  expenses,
  onEdit,
}: {
  metrics: BusinessMetrics;
  purchases: BusinessData["purchases"];
  expenses: BusinessExpense[];
  onEdit: (expense: BusinessExpense) => void;
}) {
  const rows = [
    ...purchases.map((p) => ({ kind: "purchase" as const, id: p.id, date: p.date, createdAt: p.createdAt, item: p })),
    ...expenses.map((e) => ({ kind: "expense" as const, id: e.id, date: e.date, createdAt: e.createdAt, item: e })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Total {formatMoney(metrics.expense)} · Las compras de material se cargan desde Stock.
      </p>
      {rows.length === 0 && <Empty text="Sin gastos del negocio en este período." />}
      {rows.length > 0 && (
        <CollapsibleList limit={15} className="divide-y rounded-3xl border bg-card">
          {rows.map((r) =>
            r.kind === "purchase" ? (
              <li key={`p:${r.id}`} className="flex items-center gap-2 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {r.item.name} × {r.item.qty}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {CONCEPT_LABEL.materials} · {formatShortDate(r.date)}
                    {r.item.supplier ? ` · ${r.item.supplier}` : ""}
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">−{formatMoney(r.item.total)}</span>
                <UndoButton label="Deshacer compra" action={() => deleteMaterialPurchase(r.id)} />
              </li>
            ) : (
              <li key={`e:${r.id}`}>
                <button
                  type="button"
                  onClick={() => onEdit(r.item)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.item.note || CONCEPT_LABEL[r.item.concept]}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[r.item.note ? CONCEPT_LABEL[r.item.concept] : null, formatShortDate(r.date), r.item.supplier]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">−{formatMoney(r.item.amount)}</span>
                </button>
              </li>
            ),
          )}
        </CollapsibleList>
      )}
    </>
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
          {order.materials.map((m) => `${m.name} × ${m.qty}`).join(", ")} · Costo {formatMoney(cost)} · Te deja{" "}
          {formatMoney(order.amount - cost)} ({orderMargin(order)}%)
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
