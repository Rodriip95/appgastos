"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, FileUp, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import {
  analyzeStatement,
  importStatement,
  type StatementImportInput,
  type StatementItem,
  type StatementPreview,
} from "@/lib/actions/card-import";
import { formatAmountInput, formatMoney, formatMonth, parseAmount } from "@/lib/finance/format";
import type { Category, CreditCard } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

type Row = Omit<StatementItem, "amount" | "installment" | "installments"> & {
  amount: string;
  installment: string;
  installments: string;
  selected: boolean;
};

const toRow = (it: StatementItem): Row => ({
  ...it,
  amount: formatAmountInput(String(it.amount).replace(".", ",")),
  installment: String(it.installment),
  installments: String(it.installments),
  // Lo que está en dólares o parece ya cargado arranca sin marcar.
  selected: it.currency === "ARS" && !it.duplicate,
});

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

export function ImportStatementButton({ cards, categories }: { cards: CreditCard[]; categories: Category[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" className="h-10" onClick={() => setOpen(true)}>
        <FileUp /> Importar resumen
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Importar resumen"
        description="Sube el PDF o una foto del resumen. Bingo lo lee y antes de guardar revisas cada consumo."
      >
        {open && <StatementImport cards={cards} categories={categories} onDone={() => setOpen(false)} />}
      </ResponsiveSheet>
    </>
  );
}

function StatementImport({
  cards,
  categories,
  onDone,
}: {
  cards: CreditCard[];
  categories: Category[];
  onDone: () => void;
}) {
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [month, setMonth] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, startTransition] = useTransition();

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);
  const card = cards.find((c) => c.id === cardId);

  function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Elige el archivo del resumen");
    if (file.size > MAX_BYTES) return toast.error("El archivo pesa más de 4 MB");
    const data = new FormData();
    data.set("cardId", cardId);
    data.set("file", file);
    startTransition(async () => {
      const res = await analyzeStatement(data);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPreview(res.preview);
      setMonth(res.preview.month);
      setRows(res.preview.items.map(toRow));
    });
  }

  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const selected = rows.filter((r) => r.selected);
  const total = selected.reduce((s, r) => s + (parseAmount(r.amount) ?? 0), 0);

  function save() {
    const items: StatementImportInput["items"] = [];
    for (const r of selected) {
      const amount = parseAmount(r.amount);
      if (amount === null) return toast.error(`Revisa el monto de "${r.note || "un consumo"}"`);
      items.push({
        date: r.date,
        note: r.note,
        amount,
        installment: Number(r.installment),
        installments: Number(r.installments),
        categoryId: r.categoryId,
        subcategoryId: r.subcategoryId,
      });
    }
    startTransition(async () => {
      const res = await importStatement({ cardId, month, items });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Cargamos ${res.count} ${res.count === 1 ? "consumo" : "consumos"} en ${card?.name ?? "la tarjeta"}`);
      onDone();
    });
  }

  if (!preview) {
    return (
      <form onSubmit={analyze} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="import-card">Tarjeta</Label>
          <select
            id="import-card"
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className={cn(selectClass, "h-11 text-base")}
          >
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="import-file">Resumen (PDF o imagen, hasta 4 MB)</Label>
          <Input
            id="import-file"
            type="file"
            accept={ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="h-11 text-base"
          />
        </div>

        <Button type="submit" className="h-11" disabled={pending || !file || !cardId}>
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {pending ? "Leyendo el resumen…" : "Analizar resumen"}
        </Button>
        {pending && (
          <p className="text-center text-xs text-muted-foreground">Puede tardar hasta un minuto.</p>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="import-month">Resumen que vence en</Label>
        <Input
          id="import-month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-11 text-base"
        />
        <p className="text-xs text-muted-foreground">
          {month ? `Cada consumo se carga en ${formatMonth(month)} ` : "Cada consumo se carga en ese mes "}y las
          cuotas que quedan, en los meses siguientes.
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {selected.length} de {rows.length} consumos
        </span>
        <button
          type="button"
          className="text-xs font-medium text-primary"
          onClick={() => {
            const all = selected.length < rows.length;
            setRows((prev) => prev.map((r) => ({ ...r, selected: all })));
          }}
        >
          {selected.length < rows.length ? "Marcar todos" : "Desmarcar todos"}
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => {
          const category = expenseCategories.find((c) => c.id === r.categoryId);
          return (
            <li
              key={r.key}
              className={cn("space-y-2 rounded-2xl border p-3 transition-opacity", !r.selected && "opacity-55")}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={r.selected}
                  onChange={(e) => update(r.key, { selected: e.target.checked })}
                  aria-label={`Incluir ${r.note}`}
                  className="size-4 shrink-0 accent-primary"
                />
                <Input
                  value={r.note}
                  onChange={(e) => update(r.key, { note: e.target.value })}
                  maxLength={120}
                  aria-label="Descripción"
                  className="h-9"
                />
              </div>
              {(r.currency === "USD" || r.duplicate) && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {r.currency === "USD"
                    ? "Está en dólares: pasa el monto a pesos si lo quieres cargar."
                    : "Parece que ya está cargado en este resumen."}
                </p>
              )}
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">
                    {r.currency === "USD" ? "Cuota (US$ → pasar a $)" : "Cuota de este mes"}
                  </span>
                  <Input
                    inputMode="decimal"
                    value={r.amount}
                    onChange={(e) => update(r.key, { amount: formatAmountInput(e.target.value) })}
                    aria-label="Monto"
                    className="h-9 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Cuota</span>
                  <div className="flex items-center gap-1 text-sm">
                    <Input
                      inputMode="numeric"
                      value={r.installment}
                      onChange={(e) => update(r.key, { installment: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                      aria-label="Número de cuota"
                      className="h-9 w-11 text-center"
                    />
                    <span className="text-muted-foreground">de</span>
                    <Input
                      inputMode="numeric"
                      value={r.installments}
                      onChange={(e) => update(r.key, { installments: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                      aria-label="Total de cuotas"
                      className="h-9 w-11 text-center"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={r.categoryId ?? ""}
                  onChange={(e) => update(r.key, { categoryId: e.target.value || null, subcategoryId: null })}
                  aria-label="Categoría"
                  className={selectClass}
                >
                  <option value="">Sin categoría</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={r.subcategoryId ?? ""}
                  onChange={(e) => update(r.key, { subcategoryId: e.target.value || null })}
                  aria-label="Subcategoría"
                  disabled={!category || category.subcategories.length === 0}
                  className={selectClass}
                >
                  <option value="">Sin subcategoría</option>
                  {category?.subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 bg-background px-1 pt-2 pb-1">
        <p className="text-center text-sm">
          Total de este resumen: <span className="font-semibold tabular-nums">{formatMoney(total)}</span>
        </p>
        <Button className="h-11" onClick={save} disabled={pending || selected.length === 0 || !month}>
          {pending && <Loader2 className="animate-spin" />}
          Guardar {selected.length} {selected.length === 1 ? "consumo" : "consumos"}
        </Button>
        <Button variant="ghost" onClick={() => setPreview(null)} disabled={pending}>
          <ArrowLeft /> Elegir otro archivo
        </Button>
      </div>
    </div>
  );
}
