"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import {
  ClientForm,
  ExpenseForm,
  MaterialForm,
  OrderForm,
  PaymentForm,
  PurchaseForm,
  ServiceForm,
  SettingsForm,
} from "@/components/business/BusinessForms";
import { Empty } from "@/components/business/BusinessParts";
import { Button } from "@/components/ui/button";
import {
  isLowStock,
  orderBalance,
  orderTitle,
  type BusinessData,
  type BusinessExpense,
  type BusinessSettings,
  type Client,
  type Material,
  type Order,
  type OrderKind,
  type Service,
} from "@/lib/finance/business";
import { formatMoney, formatShortDate } from "@/lib/finance/format";

/** Qué formulario (o selector previo) muestra el modal de Mi negocio. */
export type BusinessSheet =
  | { kind: "order"; order?: Order; client?: Client; orderKind?: OrderKind; date?: string }
  | { kind: "service"; service?: Service }
  | { kind: "payment"; order: Order }
  /** Cobro sin pedido elegido: primero se elige uno con saldo. */
  | { kind: "collect" }
  | { kind: "material"; material?: Material }
  | { kind: "purchase"; material: Material }
  /** Compra sin material elegido: primero se elige el material. */
  | { kind: "buy" }
  | { kind: "client"; client?: Client }
  | { kind: "expense"; expense?: BusinessExpense }
  | { kind: "settings" };

const OpenSheet = createContext<(sheet: BusinessSheet) => void>(() => {});

/** Abre un formulario de Mi negocio (dentro de `BusinessSheets`). */
export const useBusinessSheet = () => useContext(OpenSheet);

/**
 * Modal único de Mi negocio: cada pantalla lo envuelve y lo abre con `useBusinessSheet()`.
 * Recibe los datos que necesitan los formularios (todo serializable, llega del servidor).
 */
export function BusinessSheets({
  data,
  settings,
  children,
}: {
  data: BusinessData;
  settings: BusinessSettings;
  children: ReactNode;
}) {
  const { orders, materials, services, clients, purchases, expenses } = data;
  const [sheet, setSheet] = useState<BusinessSheet | null>(null);
  const close = () => setSheet(null);
  // Proveedores ya usados, para sugerirlos al cargar compras y gastos.
  const suppliers = [...new Set([...purchases, ...expenses].map((x) => x.supplier).filter(Boolean))].sort();

  return (
    <OpenSheet.Provider value={setSheet}>
      {children}
      <ResponsiveSheet open={sheet !== null} onOpenChange={(o) => !o && close()} title={sheetTitle(sheet)}>
        {sheet?.kind === "order" && (
          <OrderForm
            order={sheet.order}
            kind={sheet.orderKind}
            presetClient={sheet.client}
            presetDate={sheet.date}
            materials={materials}
            services={services}
            clients={clients}
            targetMargin={settings.targetMargin}
            onDone={close}
          />
        )}
        {sheet?.kind === "payment" && <PaymentForm order={sheet.order} onDone={close} />}
        {sheet?.kind === "collect" && (
          <CollectPicker orders={orders} onPick={(order) => setSheet({ kind: "payment", order })} />
        )}
        {sheet?.kind === "service" && <ServiceForm service={sheet.service} onDone={close} />}
        {sheet?.kind === "material" && <MaterialForm material={sheet.material} onDone={close} />}
        {sheet?.kind === "purchase" && (
          <PurchaseForm material={sheet.material} suppliers={suppliers} onDone={close} />
        )}
        {sheet?.kind === "buy" && (
          <BuyPicker
            materials={materials}
            onPick={(material) => setSheet({ kind: "purchase", material })}
            onNew={() => setSheet({ kind: "material" })}
          />
        )}
        {sheet?.kind === "client" && <ClientForm client={sheet.client} onDone={close} />}
        {sheet?.kind === "expense" && <ExpenseForm expense={sheet.expense} suppliers={suppliers} onDone={close} />}
        {sheet?.kind === "settings" && <SettingsForm targetMargin={settings.targetMargin} onDone={close} />}
      </ResponsiveSheet>
    </OpenSheet.Provider>
  );
}

function sheetTitle(sheet: BusinessSheet | null): string {
  if (!sheet) return "Mi negocio";
  switch (sheet.kind) {
    case "order": {
      const turn = (sheet.order?.kind ?? sheet.orderKind) === "appointment";
      return `${sheet.order ? "Editar" : "Nuevo"} ${turn ? "turno" : "pedido"}`;
    }
    case "service":
      return sheet.service ? "Editar servicio" : "Nuevo servicio";
    case "payment":
      return "Registrar pago";
    case "collect":
      return "¿Qué te pagaron?";
    case "material":
      return sheet.material ? "Editar material" : "Nuevo material";
    case "purchase":
      return `Comprar ${sheet.material.name}`;
    case "buy":
      return "¿Qué compraste?";
    case "client":
      return sheet.client ? "Editar cliente" : "Nuevo cliente";
    case "expense":
      return sheet.expense ? "Editar gasto" : "Gasto del negocio";
    case "settings":
      return "Precios";
  }
}

const PICK_ROW =
  "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none";

/** Pedidos y turnos con saldo, para registrar un cobro. Los que se entregan antes, primero. */
function CollectPicker({ orders, onPick }: { orders: Order[]; onPick: (order: Order) => void }) {
  const owing = orders
    .filter((o) => o.status !== "cancelled" && orderBalance(o) > 0)
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  if (owing.length === 0) return <Empty text="No tienes saldos por cobrar." />;
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border">
      {owing.map((o) => (
        <li key={o.id}>
          <button type="button" onClick={() => onPick(o)} className={PICK_ROW}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{o.client}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {orderTitle(o) || (o.kind === "appointment" ? "Turno" : "Pedido")} · {formatShortDate(o.deliveryDate)}
              </span>
            </span>
            <span className="text-sm font-medium tabular-nums">{formatMoney(orderBalance(o))}</span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Materiales para registrar una compra (los que hay que reponer, primero) o uno nuevo. */
function BuyPicker({
  materials,
  onPick,
  onNew,
}: {
  materials: Material[];
  onPick: (material: Material) => void;
  onNew: () => void;
}) {
  const sorted = [...materials].sort(
    (a, b) => Number(isLowStock(b)) - Number(isLowStock(a)) || a.name.localeCompare(b.name),
  );
  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <Empty text="Primero carga el material: así la compra suma stock y fija su precio." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border">
          {sorted.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onPick(m)} className={PICK_ROW}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.name}</span>
                  <span className="block truncate text-xs text-muted-foreground tabular-nums">
                    Quedan {m.stock} {m.unit}
                    {isLowStock(m) ? " · Reponer" : ""}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" className="w-full" onClick={onNew}>
        <Plus /> Nuevo material
      </Button>
    </div>
  );
}
