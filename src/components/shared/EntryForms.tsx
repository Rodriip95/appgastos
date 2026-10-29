"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { firstName, money } from "@/components/shared/shared-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addSharedExpense, addSharedSettlement } from "@/lib/actions/shared";
import { formatAmountInput, parseAmount, todayKey } from "@/lib/finance/format";
import type { SharedMember, SharedSpace } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-muted p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-9 min-w-0 flex-1 truncate rounded-lg px-2 text-sm font-medium transition",
              value === o.value ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function AmountField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="text-center">
      <Label htmlFor={id} className="sr-only">
        Monto
      </Label>
      <div className="flex items-baseline justify-center gap-1">
        <span className="shrink-0 text-3xl font-semibold text-muted-foreground" aria-hidden>
          $
        </span>
        <span className="inline-grid min-w-0 text-4xl font-semibold tabular-nums">
          <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
            {value || "0"}
          </span>
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            autoFocus
            value={value}
            onChange={(e) => onChange(formatAmountInput(e.target.value))}
            className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground/40"
          />
        </span>
      </div>
    </div>
  );
}

function DateNoteFields({
  date,
  setDate,
  note,
  setNote,
}: {
  date: string;
  setDate: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="entry-date">Fecha</Label>
        <Input
          id="entry-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="entry-note">
          Nota <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="entry-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          className="h-11 text-base"
        />
      </div>
    </div>
  );
}

const nameOf = (m: SharedMember, me: string) => (m.uid === me ? "Tú" : firstName(m));

type ExpenseProps = {
  space: SharedSpace;
  /** Participantes activos */
  members: SharedMember[];
  me: string;
  onDone: () => void;
};

export function ExpenseForm({ space, members, me, onDone }: ExpenseProps) {
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(me);
  const [splitWith, setSplitWith] = useState("equal");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!value) {
      toast.error("Ingresa un monto mayor a 0");
      return;
    }
    startTransition(async () => {
      const res = await addSharedExpense({
        spaceId: space.id,
        paidBy,
        amount: value,
        date,
        note,
        subcategoryId: subcategoryId || null,
        splitWith,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Registraste ${money(Math.round(value * 100))}`);
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <AmountField id="expense-amount" value={amount} onChange={setAmount} />

      <Segmented
        label="Pagó"
        value={paidBy}
        onChange={setPaidBy}
        options={members.map((m) => ({ value: m.uid, label: nameOf(m, me) }))}
      />

      <Segmented
        label="Se reparte"
        value={splitWith}
        onChange={setSplitWith}
        options={[
          { value: "equal", label: "Entre todos" },
          ...members.map((m) => ({ value: m.uid, label: `Solo ${nameOf(m, me)}` })),
        ]}
      />

      {space.subcategories.length > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Subcategoría</legend>
          <div className="flex flex-wrap gap-1.5">
            {[{ id: "", name: "Ninguna" }, ...space.subcategories].map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={subcategoryId === s.id}
                onClick={() => setSubcategoryId(s.id)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition",
                  subcategoryId === s.id
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <DateNoteFields date={date} setDate={setDate} note={note} setNote={setNote} />

      <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Registrar gasto
      </Button>
    </form>
  );
}

type SettlementProps = {
  spaceId: string;
  members: SharedMember[];
  me: string;
  /** Saldo de quien consulta en centavos: sugiere quién le pasa a quién y cuánto */
  myNet: number;
  onDone: () => void;
};

/** Registra un pago entre participantes para equilibrar el balance. */
export function SettlementForm({ spaceId, members, me, myNet, onDone }: SettlementProps) {
  const other = members.find((m) => m.uid !== me)?.uid ?? me;
  // Si puse de menos (saldo negativo) soy quien paga; si puse de más, me pagan.
  const [from, setFrom] = useState(myNet > 0 ? other : me);
  const [to, setTo] = useState(myNet > 0 ? me : other);
  const [amount, setAmount] = useState(
    myNet !== 0 ? formatAmountInput(String(Math.abs(myNet) / 100).replace(".", ",")) : "",
  );
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const options = members.map((m) => ({ value: m.uid, label: nameOf(m, me) }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!value) {
      toast.error("Ingresa un monto mayor a 0");
      return;
    }
    startTransition(async () => {
      const res = await addSharedSettlement({ spaceId, paidBy: from, toUid: to, amount: value, date, note });
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
      <AmountField id="settlement-amount" value={amount} onChange={setAmount} />
      <Segmented label="De" value={from} onChange={setFrom} options={options} />
      <Segmented label="A" value={to} onChange={setTo} options={options} />
      <DateNoteFields date={date} setDate={setDate} note={note} setNote={setNote} />
      <Button type="submit" size="lg" className="h-12 text-base" disabled={pending || from === to}>
        {pending && <Loader2 className="animate-spin" />} Registrar pago
      </Button>
    </form>
  );
}
