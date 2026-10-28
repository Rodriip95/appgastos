"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_COLORS } from "@/components/categories/CategoryIcon";
import { deleteCard, saveCard } from "@/lib/actions/cards";
import { COLOR_KEYS, type ColorKey } from "@/lib/finance/catalog";
import type { CreditCard } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Props = {
  card?: CreditCard;
  onDone: () => void;
};

const toDay = (v: string) => (v === "" ? Number.NaN : Number(v));

export function CardForm({ card, onDone }: Props) {
  const [name, setName] = useState(card?.name ?? "");
  const [closingDay, setClosingDay] = useState(card ? String(card.closingDay) : "");
  const [dueDay, setDueDay] = useState(card ? String(card.dueDay) : "");
  const [color, setColor] = useState<ColorKey>(card?.color ?? "indigo");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveCard(
        { name, closingDay: toDay(closingDay), dueDay: toDay(dueDay), color },
        card?.id,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(card ? "Tarjeta actualizada" : "Tarjeta agregada");
      onDone();
    });
  }

  function handleDelete() {
    if (!card) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteCard(card.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Tarjeta eliminada");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <Label htmlFor="card-name">Nombre</Label>
        <Input
          id="card-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Visa Galicia"
          maxLength={30}
          required
          className="h-11 text-base"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="card-closing">Día de cierre</Label>
          <Input
            id="card-closing"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={closingDay}
            onChange={(e) => setClosingDay(e.target.value)}
            placeholder="Ej: 25"
            required
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="card-due">Día de vencimiento</Label>
          <Input
            id="card-due"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            placeholder="Ej: 5"
            required
            className="h-11 text-base"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Las compras posteriores al cierre pasan al resumen siguiente. Si el vencimiento es antes del
        cierre, se toma el del mes siguiente.
      </p>

      <fieldset className="space-y-2.5">
        <legend className="text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              aria-pressed={color === c}
              className={cn(
                "grid size-9 place-items-center rounded-full text-white transition active:scale-95",
                CATEGORY_COLORS[c].solid,
                color === c && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
              )}
            >
              {color === c && <Check className="size-4" />}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={pending} className="h-12 text-base">
          {pending && <Loader2 className="animate-spin" />}
          {card ? "Guardar cambios" : "Agregar tarjeta"}
        </Button>
        {card && (
          <Button
            type="button"
            variant={confirmDelete ? "destructive" : "ghost"}
            className="h-11 text-muted-foreground data-[variant=destructive]:text-destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            <Trash2 />
            {confirmDelete ? "Toca de nuevo para confirmar" : "Eliminar tarjeta"}
          </Button>
        )}
      </div>
    </form>
  );
}
