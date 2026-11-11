"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarPlus, Clock, Pencil, Plus, Receipt, ShoppingCart } from "lucide-react";
import { CollapsibleList } from "@/components/common/CollapsibleList";
import {
  Empty,
  IconButton,
  OrderCard,
  PeriodHeader,
  SubpageHeader,
  UndoButton,
  WhatsAppLink,
} from "@/components/business/BusinessParts";
import { BusinessSheets, useBusinessSheet } from "@/components/business/BusinessSheets";
import { MonthCalendar } from "@/components/business/MonthCalendar";
import { Button } from "@/components/ui/button";
import { deleteMaterialPurchase } from "@/lib/actions/business";
import type { BalanceView } from "@/lib/finance/balance-view";
import {
  businessMetrics,
  clientStats,
  CONCEPT_LABEL,
  dayAgenda,
  isLowStock,
  isOpen,
  monthMarks,
  orderBalance,
  sortOrders,
  stockValue,
  type BusinessData,
  type BusinessSettings,
  type DateRange,
  type Order,
} from "@/lib/finance/business";
import { formatMoney, formatMonthShort, formatShortDate, shiftMonth } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

export type BusinessSectionName = "agenda" | "pedidos" | "clientes" | "stock" | "gastos" | "numeros";

type Props = {
  section: BusinessSectionName;
  data: BusinessData & { settings: BusinessSettings };
  today: string;
  month: string;
  view: BalanceView;
  range: DateRange;
  /** Vista elegida (sin `?`), para volver a Mi negocio con la misma */
  query: string;
};

/** Una sección de Mi negocio en su propia pantalla (`/negocio/<sección>`). */
export function BusinessSectionView(props: Props) {
  return (
    <BusinessSheets data={props.data} settings={props.data.settings}>
      <main className="space-y-4">
        {props.section === "agenda" && <Agenda {...props} />}
        {props.section === "pedidos" && <Orders {...props} />}
        {props.section === "clientes" && <Clients {...props} />}
        {props.section === "stock" && <Stock {...props} />}
        {props.section === "gastos" && <Expenses {...props} />}
        {props.section === "numeros" && <Numbers {...props} />}
      </main>
    </BusinessSheets>
  );
}

const inRange = (date: string, { from, to }: DateRange) => (!from || date >= from) && date <= to;

/** Tarjeta de pedido/turno que abre edición y cobro en el modal. */
function Card({ order, data, today }: { order: Order; data: BusinessData; today: string }) {
  const open = useBusinessSheet();
  return (
    <OrderCard
      order={order}
      payments={data.payments.filter((p) => p.orderId === order.id)}
      today={today}
      onEdit={() => open({ kind: "order", order })}
      onPay={() => open({ kind: "payment", order })}
    />
  );
}

function Agenda({ data, today, query }: Props) {
  const open = useBusinessSheet();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const agenda = dayAgenda(data.orders, selected);
  const pending = agenda.filter(isOpen);
  const turns = pending.filter((o) => o.kind === "appointment").length;
  const deliveries = pending.length - turns;
  const summary = [
    turns ? `${turns} ${turns === 1 ? "turno" : "turnos"}` : null,
    deliveries ? `${deliveries} ${deliveries === 1 ? "entrega" : "entregas"}` : null,
  ].filter(Boolean);

  return (
    <>
      <SubpageHeader title="Agenda" description="Turnos y entregas de cada día." query={query} />
      <MonthCalendar
        month={month}
        today={today}
        selected={selected}
        marks={monthMarks(data.orders, month)}
        onSelect={(date) => {
          setSelected(date);
          setMonth(date.slice(0, 7));
        }}
        onMonth={setMonth}
      />

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h2 className="font-semibold">
            {selected === today ? "Hoy" : formatShortDate(selected).replace(/^\w/, (c) => c.toUpperCase())}
          </h2>
          <p className="text-xs text-muted-foreground">{summary.length ? summary.join(" y ") : "Nada agendado"}</p>
        </div>
        <Button onClick={() => open({ kind: "order", orderKind: "appointment", date: selected })}>
          <CalendarPlus /> Turno
        </Button>
      </div>

      {agenda.map((o) => (
        <Card key={o.id} order={o} data={data} today={today} />
      ))}
    </>
  );
}

function Orders({ data, today, query }: Props) {
  const open = useBusinessSheet();
  const orders = sortOrders(data.orders.filter((o) => o.kind === "order"));
  const pending = orders.filter(isOpen);
  const closed = orders.filter((o) => !isOpen(o));
  const toCollect = pending.reduce((sum, o) => sum + orderBalance(o), 0);

  return (
    <>
      <SubpageHeader
        title="Pedidos"
        description={`${pending.length} ${pending.length === 1 ? "abierto" : "abiertos"} · A cobrar ${formatMoney(toCollect)}`}
        query={query}
      >
        <Button onClick={() => open({ kind: "order" })}>
          <Plus /> Pedido
        </Button>
      </SubpageHeader>
      {orders.length === 0 && <Empty text="Todavía no tienes pedidos." />}
      {pending.map((o) => (
        <Card key={o.id} order={o} data={data} today={today} />
      ))}
      {closed.length > 0 && (
        <>
          <h2 className="pt-2 text-sm font-medium text-muted-foreground">Entregados y cancelados</h2>
          <CollapsibleList limit={5} className="space-y-3">
            {closed.map((o) => (
              <li key={o.id}>
                <Card order={o} data={data} today={today} />
              </li>
            ))}
          </CollapsibleList>
        </>
      )}
    </>
  );
}

function Clients({ data, query: back }: Props) {
  const open = useBusinessSheet();
  const [query, setQuery] = useState("");
  const { clients, orders } = data;
  const stats = clientStats(orders);
  const q = query.trim().toLowerCase();
  const shown = clients
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q))
    .sort((a, b) => (stats.get(b.id)?.paid ?? 0) - (stats.get(a.id)?.paid ?? 0) || a.name.localeCompare(b.name));

  return (
    <>
      <SubpageHeader title="Clientes" description="Lo que pagó y debe cada uno." query={back}>
        <Button onClick={() => open({ kind: "client" })}>
          <Plus /> Cliente
        </Button>
      </SubpageHeader>
      {clients.length > 0 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente"
          aria-label="Buscar cliente"
          className="h-10 w-full rounded-xl border bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm"
        />
      )}
      {clients.length === 0 && <Empty text="Tus clientes aparecen acá al cargar pedidos, o agrégalos a mano." />}
      {shown.length > 0 && (
        <CollapsibleList limit={15} className="divide-y rounded-3xl border bg-card">
          {shown.map((c) => {
            const s = stats.get(c.id);
            return (
              <li key={c.id} className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => open({ kind: "client", client: c })}
                  className="min-w-0 flex-1 overflow-hidden text-left"
                >
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
                <WhatsAppLink phone={c.phone} name={c.name} />
                <IconButton label={`Nuevo pedido de ${c.name}`} onClick={() => open({ kind: "order", client: c })}>
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

function Stock({ data, query }: Props) {
  const open = useBusinessSheet();
  const { services, materials, purchases } = data;
  // Primero lo que hay que reponer.
  const sorted = [...materials].sort((a, b) => Number(isLowStock(b)) - Number(isLowStock(a)));

  return (
    <>
      <SubpageHeader title="Stock y servicios" query={query} />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">Materiales</h2>
          <p className="text-xs text-muted-foreground">Valor del stock: {formatMoney(stockValue(materials))}</p>
        </div>
        <Button onClick={() => open({ kind: "material" })}>
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
                <IconButton label={`Comprar ${m.name}`} onClick={() => open({ kind: "purchase", material: m })}>
                  <ShoppingCart className="size-4" />
                </IconButton>
                <IconButton label={`Editar ${m.name}`} onClick={() => open({ kind: "material", material: m })}>
                  <Pencil className="size-4" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="min-w-0">
          <h2 className="font-semibold">Servicios</h2>
          <p className="text-xs text-muted-foreground">Sin stock: los eliges al agendar un turno.</p>
        </div>
        <Button variant="outline" onClick={() => open({ kind: "service" })}>
          <Plus /> Servicio
        </Button>
      </div>
      {services.length > 0 && (
        <ul className="divide-y rounded-3xl border bg-card">
          {services.map((sv) => (
            <li key={sv.id}>
              <button
                type="button"
                onClick={() => open({ kind: "service", service: sv })}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{sv.name}</span>
                {sv.duration > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> {sv.duration} min
                  </span>
                )}
                <span className="text-sm font-medium tabular-nums">{formatMoney(sv.price)}</span>
              </button>
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

function Expenses({ data, today, month, view, range, query }: Props) {
  const open = useBusinessSheet();
  const metrics = businessMetrics(data, range);
  const rows = [
    ...data.purchases
      .filter((p) => inRange(p.date, range))
      .map((p) => ({ kind: "purchase" as const, id: p.id, date: p.date, createdAt: p.createdAt, item: p })),
    ...data.expenses
      .filter((e) => inRange(e.date, range))
      .map((e) => ({ kind: "expense" as const, id: e.id, date: e.date, createdAt: e.createdAt, item: e })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  return (
    <>
      <SubpageHeader title="Gastos y compras" description={`Total ${formatMoney(metrics.expense)}`} query={query}>
        <Button variant="outline" size="icon" aria-label="Compra de material" onClick={() => open({ kind: "buy" })}>
          <ShoppingCart />
        </Button>
        <Button onClick={() => open({ kind: "expense" })}>
          <Receipt /> Gasto
        </Button>
      </SubpageHeader>
      <PeriodHeader data={data} view={view} month={month} today={today} basePath="/negocio/gastos" />
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
                  onClick={() => open({ kind: "expense", expense: r.item })}
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Numbers({ data, today, month: viewMonth, view, range, query }: Props) {
  const metrics = businessMetrics(data, range);
  const lowStock = data.materials.filter(isLowStock);
  // Últimos 6 meses hasta el que se ve, sin los vacíos del principio.
  const month = view.kind === "month" ? viewMonth : range.to.slice(0, 7);
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
      <SubpageHeader title="Números" description="Cómo le va a tu negocio." query={query} />
      <PeriodHeader data={data} view={view} month={viewMonth} today={today} basePath="/negocio/numeros" />

      {lowStock.length > 0 && (
        <Link
          href={`/negocio/stock${query ? `?${query}` : ""}`}
          className="flex w-full items-center gap-3 rounded-2xl border border-brand-orange/40 bg-brand-orange/10 p-3 text-left text-sm"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">Poco stock de {lowStock.map((m) => m.name).join(", ")}</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Ganancia" value={formatMoney(metrics.profit)} hint={metrics.margin !== null ? `${metrics.margin}% de lo cobrado` : undefined} />
        <Stat label="Pedidos entregados" value={String(metrics.delivered)} />
        <Stat label="Ticket promedio" value={metrics.avgTicket !== null ? formatMoney(metrics.avgTicket) : "—"} />
        <Stat
          label="Margen por pedido"
          value={metrics.avgOrderMargin !== null ? `${metrics.avgOrderMargin}%` : "—"}
          hint="Precio menos materiales"
        />
        <Stat label="Por cobrar" value={formatMoney(metrics.toCollect)} hint="Saldos de pedidos" />
        <Stat label="Valor del stock" value={formatMoney(stockValue(data.materials))} />
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
