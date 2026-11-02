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
  deleteBusinessExpense,
  deleteClient,
  deleteMaterial,
  deleteOrder,
  saveBusinessExpense,
  saveBusinessSettings,
  saveClient,
  saveMaterial,
  saveOrder,
} from "@/lib/actions/business";
import {
  CONCEPT_LABEL,
  EXPENSE_CONCEPTS,
  normalizeName,
  ORDER_PRIORITIES,
  orderBalance,
  PRIORITY_LABEL,
  suggestedPrice,
  type BusinessExpense,
  type Client,
  type ExpenseConcept,
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
  clients,
  targetMargin,
  presetClient,
  onDone,
}: {
  order?: Order;
  materials: Material[];
  clients: Client[];
  targetMargin: number;
  /** Cliente ya elegido (al crear un pedido desde su ficha) */
  presetClient?: Client;
  onDone: () => void;
}) {
  const [client, setClient] = useState(order?.client ?? presetClient?.name ?? "");
  const [phone, setPhone] = useState(order?.phone ?? presetClient?.phone ?? "");
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
  // Si el nombre coincide con un cliente de la libreta, el pedido queda enlazado a ese cliente.
  const matched = clients.find((c) => normalizeName(c.name) === normalizeName(client));
  const priceOf = (materialId: string) =>
    order?.materials.find((m) => m.materialId === materialId)?.unitPrice ??
    materials.find((m) => m.id === materialId)?.unitPrice ??
    0;
  const cost = lines.reduce((sum, l) => sum + (parseQty(l.qty) ?? 0) * priceOf(l.materialId), 0);
  const suggested = suggestedPrice(cost, targetMargin);
  const price = parseAmount(amount);
  const margin = price && cost > 0 ? Math.round(((price - cost) / price) * 100) : null;

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
        {
          clientId: matched?.id ?? null,
          client,
          phone,
          detail,
          amount: parsedAmount,
          priority,
          deliveryDate,
          materials: parsedLines,
        },
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
            list="order-clients"
            value={client}
            onChange={(e) => {
              setClient(e.target.value);
              const found = clients.find((c) => normalizeName(c.name) === normalizeName(e.target.value));
              if (found?.phone && !phone) setPhone(found.phone);
            }}
            maxLength={60}
            autoComplete="off"
            className="h-11 text-base"
            required
          />
          <datalist id="order-clients">
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">
            {client.trim() ? (matched ? "Cliente de tu libreta" : "Se agrega como cliente nuevo") : "Elige uno o escribe uno nuevo"}
          </p>
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
            <p className="text-xs text-muted-foreground">Carga tus materiales en la pestaña Stock.</p>
          )
        )}
      </div>

      {cost > 0 && (
        <div className="space-y-1 rounded-2xl bg-muted/60 p-3 text-sm">
          <p className="flex justify-between gap-2">
            <span className="text-muted-foreground">Costo de materiales</span>
            <span className="tabular-nums">{formatMoney(cost)}</span>
          </p>
          {margin !== null && (
            <p className="flex justify-between gap-2">
              <span className="text-muted-foreground">Te deja</span>
              <span className={cn("tabular-nums", margin < 0 && "text-destructive")}>
                {formatMoney(price! - cost)} ({margin}%)
              </span>
            </p>
          )}
          {suggested && (
            <p className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Precio sugerido ({targetMargin}% de margen)</span>
              <button
                type="button"
                onClick={() => setAmount(amountText(suggested))}
                className="font-medium tabular-nums underline-offset-4 hover:underline"
              >
                {formatMoney(suggested)}
              </button>
            </p>
          )}
        </div>
      )}

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
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!parsed) {
      toast.error("Ingresa el monto del pago");
      return;
    }
    startTransition(async () => {
      const res = await addOrderPayment({ orderId: order.id, amount: parsed, date, note });
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
      <p className="text-xs text-muted-foreground">Suma como ingreso en tu balance general.</p>
      <SubmitButton pending={pending} label="Registrar pago" />
    </form>
  );
}

export function MaterialForm({ material, onDone }: { material?: Material; onDone: () => void }) {
  const [name, setName] = useState(material?.name ?? "");
  const [unit, setUnit] = useState(material?.unit ?? "un");
  const [unitPrice, setUnitPrice] = useState(material ? amountText(material.unitPrice) : "");
  const [stock, setStock] = useState(material ? String(material.stock) : "0");
  const [minStock, setMinStock] = useState(material?.minStock ? String(material.minStock) : "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedStock = parseQty(stock);
    const parsedMin = minStock.trim() ? parseQty(minStock) : 0;
    if (parsedStock === null || parsedMin === null || parsedMin < 0) {
      toast.error("Revisa el stock");
      return;
    }
    startTransition(async () => {
      const res = await saveMaterial(
        { name, unit, unitPrice: parseAmount(unitPrice) ?? 0, stock: parsedStock, minStock: parsedMin },
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
      <div className="space-y-1.5">
        <Label htmlFor="material-min">Avisarme con stock de</Label>
        <Input
          id="material-min"
          inputMode="decimal"
          value={minStock}
          onChange={(e) => setMinStock(e.target.value)}
          placeholder="Sin aviso"
          className="h-11 text-base tabular-nums"
        />
        <p className="text-xs text-muted-foreground">Bingo te avisa cuando quede esa cantidad o menos.</p>
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

export function PurchaseForm({
  material,
  suppliers,
  onDone,
}: {
  material: Material;
  /** Proveedores usados antes, para sugerirlos */
  suppliers: string[];
  onDone: () => void;
}) {
  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");
  const [date, setDate] = useState(todayKey());
  const [supplier, setSupplier] = useState("");
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
      const res = await addMaterialPurchase({
        materialId: material.id,
        qty: parsedQty,
        total: parsedTotal,
        date,
        supplier,
      });
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
      <div className="grid grid-cols-2 gap-3">
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
        <SupplierInput id="purchase-supplier" value={supplier} onChange={setSupplier} suppliers={suppliers} />
      </div>
      <p className="text-xs text-muted-foreground">Suma al stock y cuenta como gasto del negocio y de tu balance general.</p>
      <SubmitButton pending={pending} label="Registrar compra" />
    </form>
  );
}


function SupplierInput({
  id,
  value,
  onChange,
  suppliers,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  suppliers: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Proveedor</Label>
      <Input
        id={id}
        list={`${id}-list`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Opcional"
        maxLength={60}
        autoComplete="off"
        className="h-11 text-base"
      />
      <datalist id={`${id}-list`}>
        {suppliers.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

export function ClientForm({ client, onDone }: { client?: Client; onDone: () => void }) {
  const [name, setName] = useState(client?.name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [note, setNote] = useState(client?.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveClient({ name, phone, note }, client?.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(client ? "Cliente actualizado" : "Cliente agregado");
      onDone();
    });
  }

  function handleDelete() {
    if (!client) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteClient(client.id);
      if (!res.ok) {
        toast.error(res.error);
        setConfirmDelete(false);
        return;
      }
      toast.success("Cliente eliminado");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="client-name">Nombre</Label>
          <Input
            id="client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoComplete="off"
            className="h-11 text-base"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-phone">Teléfono</Label>
          <Input
            id="client-phone"
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
        <Label htmlFor="client-note">Nota</Label>
        <Textarea
          id="client-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: prefiere colores pastel, retira por el local"
          maxLength={200}
          className="text-base"
        />
      </div>
      <SubmitButton pending={pending} label={client ? "Guardar cambios" : "Agregar cliente"} />
      {client && (
        <DeleteButton
          pending={pending}
          confirming={confirmDelete}
          label="Eliminar cliente"
          confirmLabel="Tocá de nuevo para confirmar"
          onClick={handleDelete}
        />
      )}
    </form>
  );
}

export function ExpenseForm({
  expense,
  suppliers,
  onDone,
}: {
  expense?: BusinessExpense;
  suppliers: string[];
  onDone: () => void;
}) {
  const [concept, setConcept] = useState<ExpenseConcept>(expense?.concept ?? "shipping");
  const [amount, setAmount] = useState(expense ? amountText(expense.amount) : "");
  const [date, setDate] = useState(expense?.date ?? todayKey());
  const [supplier, setSupplier] = useState(expense?.supplier ?? "");
  const [note, setNote] = useState(expense?.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!parsed) {
      toast.error("Ingresa el monto del gasto");
      return;
    }
    startTransition(async () => {
      const res = await saveBusinessExpense({ concept, amount: parsed, date, supplier, note }, expense?.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(expense ? "Gasto actualizado" : "Gasto registrado");
      onDone();
    });
  }

  function handleDelete() {
    if (!expense) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteBusinessExpense(expense.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Gasto eliminado");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <Label>Concepto</Label>
        <div className="grid grid-cols-3 gap-2">
          {EXPENSE_CONCEPTS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === concept}
              onClick={() => setConcept(c)}
              className={cn(
                "h-10 rounded-xl border text-sm font-medium transition",
                c === concept ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {CONCEPT_LABEL[c]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Las compras de material se cargan desde Stock.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="expense-amount">Monto</Label>
          <MoneyInput id="expense-amount" value={amount} onChange={setAmount} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-date">Fecha</Label>
          <Input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 text-base"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SupplierInput id="expense-supplier" value={supplier} onChange={setSupplier} suppliers={suppliers} />
        <div className="space-y-1.5">
          <Label htmlFor="expense-note">Detalle</Label>
          <Input
            id="expense-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opcional"
            maxLength={120}
            className="h-11 text-base"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Resta en el negocio y en tu balance general.</p>
      <SubmitButton pending={pending} label={expense ? "Guardar cambios" : "Registrar gasto"} />
      {expense && (
        <DeleteButton
          pending={pending}
          confirming={confirmDelete}
          label="Eliminar gasto"
          confirmLabel="Tocá de nuevo para confirmar"
          onClick={handleDelete}
        />
      )}
    </form>
  );
}

export function SettingsForm({ targetMargin, onDone }: { targetMargin: number; onDone: () => void }) {
  const [margin, setMargin] = useState(String(targetMargin));
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(margin);
    startTransition(async () => {
      const res = await saveBusinessSettings({ targetMargin: Math.round(parsed) });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Margen guardado");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <Label htmlFor="settings-margin">Margen objetivo (%)</Label>
        <Input
          id="settings-margin"
          inputMode="numeric"
          value={margin}
          onChange={(e) => setMargin(e.target.value.replace(/\D/g, ""))}
          className="h-11 text-base tabular-nums"
        />
        <p className="text-xs text-muted-foreground">
          Qué parte del precio quieres que quede después de pagar los materiales. Con 50%, si los materiales
          cuestan $1.000, te sugiere cobrar $2.000.
        </p>
      </div>
      <SubmitButton pending={pending} label="Guardar" />
    </form>
  );
}
