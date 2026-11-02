"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addMaterialPurchase,
  addOrderPayment,
  deleteMaterial,
  deleteOrder,
  saveMaterial,
  saveOrder,
} from "@/lib/actions/business";
import {
  ORDER_PRIORITIES,
  orderBalance,
  PRIORITY_LABEL,
  type Material,
  type Order,
  type OrderPriority,
} from "@/lib/finance/business";
import { formatAmountInput, formatMoney, parseAmount, todayKey } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

const amountText = (n: number) => formatAmountInput(String(n).replace(".", ","));

/** Cantidad con decimales ("1,5" o "1.5"); 0 también vale (stock inicial). */
const parseQty = (raw: string) => {
  const n = Number(raw.replace(",", "."));
  return raw.trim() !== "" && Number.isFinite(n) ? n : null;
};

function MoneyInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
        $
      </span>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(formatAmountInput(e.target.value))}
        placeholder="0"
        className="h-11 pl-7 text-base tabular-nums"
      />
    </div>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {label}
    </Button>
  );
}

function DeleteButton({
  pending,
  confirming,
  label,
  confirmLabel,
  onClick,
}: {
  pending: boolean;
  confirming: boolean;
  label: string;
  confirmLabel: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="ghost" className="w-full text-destructive" disabled={pending} onClick={onClick}>
      <Trash2 />
      {confirming ? confirmLabel : label}
    </Button>
  );
}

export function OrderForm({
  order,
  materials,
  onDone,
}: {
  order?: Order;
  materials: Material[];
  onDone: () => void;
}) {
  const [client, setClient] = useState(order?.client ?? "");
  const [phone, setPhone] = useState(order?.phone ?? "");
  const [detail, setDetail] = useState(order?.detail ?? "");
  const [amount, setAmount] = useState(order ? amountText(order.amount) : "");
  const [priority, setPriority] = useState<OrderPriority>(order?.priority ?? "medium");
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ?? "");
  const [lines, setLines] = useState(
    order?.materials.map((m) => ({ materialId: m.materialId, name: m.name, qty: String(m.qty) })) ?? [],
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const available = materials.filter((m) => !lines.some((l) => l.materialId === m.id));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseAmount(amount);
    if (!parsedAmount) {
      toast.error("Ingresa el monto del pedido");
      return;
    }
    if (!deliveryDate) {
      toast.error("Elige la fecha de entrega");
      return;
    }
    const parsedLines = lines.map((l) => ({ materialId: l.materialId, qty: parseQty(l.qty) ?? 0 }));
    if (parsedLines.some((l) => l.qty <= 0)) {
      toast.error("Revisa las cantidades de los materiales");
      return;
    }
    startTransition(async () => {
      const res = await saveOrder(
        { client, phone, detail, amount: parsedAmount, priority, deliveryDate, materials: parsedLines },
        order?.id,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(order ? "Pedido actualizado" : "Pedido agregado");
      onDone();
    });
  }

  function handleDelete() {
    if (!order) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteOrder(order.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pedido eliminado");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="order-client">Cliente</Label>
          <Input
            id="order-client"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            maxLength={60}
            autoComplete="off"
            className="h-11 text-base"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order-phone">Teléfono</Label>
          <Input
            id="order-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Con código de país: 54911…"
            maxLength={30}
            autoComplete="off"
            className="h-11 text-base"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="order-detail">Detalle</Label>
        <Textarea
          id="order-detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Ej: 10 centros de mesa"
          maxLength={500}
          className="text-base"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="order-amount">Monto</Label>
          <MoneyInput id="order-amount" value={amount} onChange={setAmount} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order-date">Fecha de entrega</Label>
          <Input
            id="order-date"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="h-11 text-base"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Prioridad</Label>
        <div className="grid grid-cols-3 gap-2">
          {ORDER_PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={p === priority}
              onClick={() => setPriority(p)}
              className={cn(
                "h-10 rounded-xl border text-sm font-medium transition",
                p === priority ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {PRIORITY_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Materiales</Label>
        {lines.map((line, i) => (
          <div key={line.materialId} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{line.name}</span>
            <Input
              aria-label={`Cantidad de ${line.name}`}
              inputMode="decimal"
              value={line.qty}
              onChange={(e) =>
                setLines((all) => all.map((l, j) => (j === i ? { ...l, qty: e.target.value } : l)))
              }
              className="h-10 w-20 text-right text-base tabular-nums"
            />
            <button
              type="button"
              aria-label={`Quitar ${line.name}`}
              onClick={() => setLines((all) => all.filter((_, j) => j !== i))}
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {available.length > 0 ? (
          <select
            aria-label="Agregar material"
            value=""
            onChange={(e) => {
              const m = materials.find((x) => x.id === e.target.value);
              if (m) setLines((all) => [...all, { materialId: m.id, name: m.name, qty: "1" }]);
            }}
            className="h-11 w-full rounded-lg border bg-transparent px-3 text-sm text-muted-foreground"
          >
            <option value="">Agregar material…</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({formatMoney(m.unitPrice)} / {m.unit})
              </option>
            ))}
          </select>
        ) : (
          lines.length === 0 && (
            <p className="text-xs text-muted-foreground">Carga tus materiales en la pestaña Materiales.</p>
          )
        )}
      </div>

      <SubmitButton pending={pending} label={order ? "Guardar cambios" : "Agregar pedido"} />
      {order && (
        <DeleteButton
          pending={pending}
          confirming={confirmDelete}
          label="Eliminar pedido"
          confirmLabel="Tocá de nuevo: también borra sus pagos"
          onClick={handleDelete}
        />
      )}
    </form>
  );
}

export function PaymentForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const balance = orderBalance(order);
  const [amount, setAmount] = useState(balance > 0 ? amountText(balance) : "");
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [addToSummary, setAddToSummary] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!parsed) {
      toast.error("Ingresa el monto del pago");
      return;
    }
    startTransition(async () => {
      const res = await addOrderPayment({ orderId: order.id, amount: parsed, date, note, addToSummary });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pago registrado");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Saldo de {order.client}: <strong className="text-foreground">{formatMoney(balance)}</strong>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="payment-amount">Monto</Label>
          <MoneyInput id="payment-amount" value={amount} onChange={setAmount} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payment-date">Fecha</Label>
          <Input
            id="payment-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 text-base"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="payment-note">Nota</Label>
        <Input
          id="payment-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: seña"
          maxLength={120}
          className="h-11 text-base"
        />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={addToSummary}
          onChange={(e) => setAddToSummary(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          Sumar a mi resumen personal
          <span className="block text-xs text-muted-foreground">Se registra como un ingreso más.</span>
        </span>
      </label>
      <SubmitButton pending={pending} label="Registrar pago" />
    </form>
  );
}

export function MaterialForm({ material, onDone }: { material?: Material; onDone: () => void }) {
  const [name, setName] = useState(material?.name ?? "");
  const [unit, setUnit] = useState(material?.unit ?? "un");
  const [unitPrice, setUnitPrice] = useState(material ? amountText(material.unitPrice) : "");
  const [stock, setStock] = useState(material ? String(material.stock) : "0");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedStock = parseQty(stock);
    if (parsedStock === null) {
      toast.error("Revisa el stock");
      return;
    }
    startTransition(async () => {
      const res = await saveMaterial(
        { name, unit, unitPrice: parseAmount(unitPrice) ?? 0, stock: parsedStock },
        material?.id,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(material ? "Material actualizado" : "Material agregado");
      onDone();
    });
  }

  function handleDelete() {
    if (!material) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteMaterial(material.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Material eliminado");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <Label htmlFor="material-name">Nombre</Label>
        <Input
          id="material-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Cinta de raso"
          maxLength={60}
          autoComplete="off"
          className="h-11 text-base"
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="material-unit">Unidad</Label>
          <Input
            id="material-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            maxLength={12}
            className="h-11 text-base"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="material-price">Precio</Label>
          <MoneyInput id="material-price" value={unitPrice} onChange={setUnitPrice} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="material-stock">Stock</Label>
          <Input
            id="material-stock"
            inputMode="decimal"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="h-11 text-base tabular-nums"
          />
        </div>
      </div>
      <SubmitButton pending={pending} label={material ? "Guardar cambios" : "Agregar material"} />
      {material && (
        <DeleteButton
          pending={pending}
          confirming={confirmDelete}
          label="Eliminar material"
          confirmLabel="Tocá de nuevo para confirmar"
          onClick={handleDelete}
        />
      )}
    </form>
  );
}

export function PurchaseForm({ material, onDone }: { material: Material; onDone: () => void }) {
  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");
  const [date, setDate] = useState(todayKey());
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedQty = parseQty(qty);
    const parsedTotal = parseAmount(total);
    if (!parsedQty || parsedQty <= 0 || !parsedTotal) {
      toast.error("Ingresa la cantidad y lo que pagaste");
      return;
    }
    startTransition(async () => {
      const res = await addMaterialPurchase({ materialId: material.id, qty: parsedQty, total: parsedTotal, date });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Compra registrada");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="purchase-qty">Cantidad ({material.unit})</Label>
          <Input
            id="purchase-qty"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-11 text-base tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchase-total">Total pagado</Label>
          <MoneyInput id="purchase-total" value={total} onChange={setTotal} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="purchase-date">Fecha</Label>
        <Input
          id="purchase-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 text-base"
          required
        />
      </div>
      <SubmitButton pending={pending} label="Registrar compra" />
    </form>
  );
}

