"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  HandCoins,
  Package,
  Plus,
  Receipt,
  Settings2,
  ShoppingCart,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { IconButton, PeriodHeader, ProfitCard } from "@/components/business/BusinessParts";
import { BusinessSheets, useBusinessSheet, type BusinessSheet } from "@/components/business/BusinessSheets";
import type { BalanceView } from "@/lib/finance/balance-view";
import {
  businessMetrics,
  dayAgenda,
  isLowStock,
  isOpen,
  type BusinessData,
  type BusinessSettings,
  type DateRange,
} from "@/lib/finance/business";
import { formatMoney, shiftMonth } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

type Props = {
  data: BusinessData & { settings: BusinessSettings };
  today: string;
  month: string;
  view: BalanceView;
  range: DateRange;
  /** Vista elegida (sin `?`), para que las secciones abran con la misma */
  query: string;
};

/** Pantalla principal de Mi negocio: ganancia, carga rápida y una botonera a cada sección. */
export function BusinessHome(props: Props) {
  return (
    <BusinessSheets data={props.data} settings={props.data.settings}>
      <Home {...props} />
    </BusinessSheets>
  );
}

const QUICK_ADD: { label: string; icon: LucideIcon; sheet: BusinessSheet }[] = [
  { label: "Pedido", icon: Plus, sheet: { kind: "order" } },
  { label: "Turno", icon: CalendarPlus, sheet: { kind: "order", orderKind: "appointment" } },
  { label: "Cobro", icon: HandCoins, sheet: { kind: "collect" } },
  { label: "Gasto", icon: Receipt, sheet: { kind: "expense" } },
  { label: "Compra", icon: ShoppingCart, sheet: { kind: "buy" } },
  { label: "Cliente", icon: UserPlus, sheet: { kind: "client" } },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Home({ data, today, month, view, range, query }: Props) {
  const open = useBusinessSheet();
  const { orders, materials, services, clients } = data;
  const metrics = businessMetrics(data, range);
  const prevMonth = shiftMonth(month, -1);
  const prevMetrics =
    view.kind === "month" ? businessMetrics(data, { from: `${prevMonth}-01`, to: `${prevMonth}-31` }) : null;

  // Lo que muestra cada botón de la botonera.
  const todayOpen = dayAgenda(orders, today).filter(isOpen);
  const turns = todayOpen.filter((o) => o.kind === "appointment").length;
  const deliveries = todayOpen.length - turns;
  const openOrders = orders.filter((o) => o.kind === "order" && isOpen(o));
  const late = openOrders.filter((o) => o.deliveryDate < today).length;
  const low = materials.filter(isLowStock).length;

  const sections: Section[] = [
    {
      slug: "agenda",
      label: "Agenda",
      icon: CalendarDays,
      hint: todayOpen.length
        ? `Hoy: ${[turns && plural(turns, "turno", "turnos"), deliveries && plural(deliveries, "entrega", "entregas")]
            .filter(Boolean)
            .join(" y ")}`
        : "Nada agendado hoy",
    },
    {
      slug: "pedidos",
      label: "Pedidos",
      icon: ClipboardList,
      hint: late
        ? plural(late, "atrasado", "atrasados")
        : openOrders.length
          ? plural(openOrders.length, "en curso", "en curso")
          : "Sin pedidos abiertos",
      alert: late > 0,
    },
    {
      slug: "clientes",
      label: "Clientes",
      icon: Users,
      hint: clients.length ? plural(clients.length, "cliente", "clientes") : "Todavía sin clientes",
    },
    {
      slug: "stock",
      label: "Stock y servicios",
      icon: Package,
      hint: low
        ? `${low} para reponer`
        : materials.length || services.length
          ? [materials.length && plural(materials.length, "material", "materiales"), services.length && plural(services.length, "servicio", "servicios")]
              .filter(Boolean)
              .join(" · ")
          : "Materiales y servicios",
      alert: low > 0,
    },
    {
      slug: "gastos",
      label: "Gastos y compras",
      icon: Receipt,
      hint: metrics.expense > 0 ? `Gastaste ${formatMoney(metrics.expense)}` : "Sin gastos en el período",
    },
    {
      slug: "numeros",
      label: "Números",
      icon: BarChart3,
      hint: metrics.toCollect > 0 ? `${formatMoney(metrics.toCollect)} por cobrar` : "Ticket, margen y clientes",
    },
  ];

  return (
    <main className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mi negocio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lo que cobras y gastas acá también suma en tu balance general.
          </p>
        </div>
        <IconButton label="Margen y precios" onClick={() => open({ kind: "settings" })}>
          <Settings2 className="size-4" />
        </IconButton>
      </div>

      <PeriodHeader data={data} view={view} month={month} today={today} basePath="/negocio" />

      <ProfitCard metrics={metrics} prev={prevMetrics} prevMonth={prevMonth} />

      <section aria-labelledby="business-add" className="space-y-2">
        <h2 id="business-add" className="text-sm font-medium text-muted-foreground">
          Cargar
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUICK_ADD.map(({ label, icon: Icon, sheet }, i) => (
            <button
              key={label}
              type="button"
              onClick={() => open(sheet)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-sm font-medium transition active:scale-[0.97]",
                i < 2
                  ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-card hover:bg-muted/60",
              )}
            >
              <Icon className={cn("size-5", i >= 2 && "text-primary")} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <nav aria-label="Secciones de Mi negocio" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sections.map((s) => (
          <SectionTile key={s.slug} section={s} query={query} />
        ))}
      </nav>
    </main>
  );
}

type Section = { slug: string; label: string; icon: LucideIcon; hint: string; alert?: boolean };

function SectionTile({ section: { slug, label, icon: Icon, hint, alert }, query }: { section: Section; query: string }) {
  return (
    <Link
      href={`/negocio/${slug}${query ? `?${query}` : ""}`}
      className="group flex min-h-28 flex-col justify-between gap-3 rounded-3xl border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold leading-tight">{label}</p>
        <p
          className={cn(
            "mt-0.5 truncate text-xs tabular-nums",
            alert ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      </div>
    </Link>
  );
}
