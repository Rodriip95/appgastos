"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CategoryIcon,
} from "@/components/categories/CategoryIcon";
import { deleteCategory, saveCategory } from "@/lib/actions/categories";
import { COLOR_KEYS, ICON_KEYS, type ColorKey, type IconKey } from "@/lib/finance/catalog";
import { parseAmount } from "@/lib/finance/format";
import type { Category, Subcategory, TxType } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Props = {
  type: TxType;
  category?: Category;
  onDone: () => void;
};

export function CategoryForm({ type, category, onDone }: Props) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [budgetText, setBudgetText] = useState(
    category?.budget ? String(category.budget).replace(".", ",") : "",
  );
  const [icon, setIcon] = useState<IconKey>(category?.icon ?? "tag");
  const [color, setColor] = useState<ColorKey>(category?.color ?? (type === "income" ? "emerald" : "sky"));
  const [subs, setSubs] = useState<Subcategory[]>(category?.subcategories ?? []);
  const [newSub, setNewSub] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function addSub() {
    const value = newSub.trim();
    if (!value) return;
    if (subs.some((s) => s.name.toLowerCase() === value.toLowerCase())) {
      toast.info(`"${value}" ya está en la lista`);
      return;
    }
    setSubs((prev) => [...prev, { id: "", name: value }]);
    setNewSub("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveCategory(
        {
          type,
          name,
          description,
          icon,
          color,
          subcategories: subs,
          budget: type === "expense" ? parseAmount(budgetText) : null,
        },
        category?.id,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(category ? "Categoría actualizada" : "Categoría creada");
      onDone();
    });
  }

  function handleDelete() {
    if (!category) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteCategory(category.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Categoría eliminada");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Vista previa + nombre */}
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size="lg" />
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="cat-name">Nombre</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === "income" ? "Ej: Sueldo" : "Ej: Carro"}
            maxLength={40}
            autoComplete="off"
            className="h-11 text-base"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cat-desc">
          Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="cat-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="¿Qué gastos entran aquí?"
          maxLength={160}
          rows={2}
          className="text-base"
        />
      </div>

      {type === "expense" && (
        <div className="space-y-1.5">
          <Label htmlFor="cat-budget">
            Presupuesto mensual <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="cat-budget"
              inputMode="decimal"
              autoComplete="off"
              value={budgetText}
              onChange={(e) => setBudgetText(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="Sin tope"
              className="h-11 pl-7 text-base tabular-nums"
            />
          </div>
          <p className="text-xs text-muted-foreground">Te avisamos al llegar al 80% y si te pasas.</p>
        </div>
      )}

      {/* Subcategorías */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Subcategorías</legend>
        {subs.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {subs.map((s, i) => (
              <li
                key={s.id || `new-${i}`}
                className="flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm"
              >
                {s.name}
                <button
                  type="button"
                  onClick={() => setSubs((prev) => prev.filter((_, j) => j !== i))}
                  className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                  aria-label={`Quitar ${s.name}`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSub();
              }
            }}
            placeholder={type === "income" ? "Ej: Aguinaldo" : "Ej: Seguro"}
            maxLength={40}
            className="h-11 text-base"
            aria-label="Nueva subcategoría"
          />
          <Button type="button" variant="secondary" className="h-11 px-4" onClick={addSub}>
            <Plus /> Agregar
          </Button>
        </div>
      </fieldset>

      {/* Ícono */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ícono</legend>
        <div className="grid grid-cols-7 gap-2 sm:grid-cols-8">
          {ICON_KEYS.map((key) => {
            const Icon = CATEGORY_ICONS[key];
            const selected = key === icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                aria-label={key}
                aria-pressed={selected}
                className={cn(
                  "grid aspect-square place-items-center rounded-xl border transition",
                  selected
                    ? cn("border-transparent ring-2 ring-foreground", CATEGORY_COLORS[color].soft)
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-5" />
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Color */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2.5">
          {COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              aria-label={key}
              aria-pressed={key === color}
              className={cn(
                "grid size-9 place-items-center rounded-full text-white ring-offset-2 ring-offset-background transition",
                CATEGORY_COLORS[key].solid,
                key === color && "ring-2 ring-foreground",
              )}
            >
              {key === color && <Check className="size-4" />}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {category ? "Guardar cambios" : "Crear categoría"}
        </Button>
        {category && (
          <Button
            type="button"
            variant={confirmDelete ? "destructive" : "ghost"}
            className="h-11 text-muted-foreground data-[variant=destructive]:text-destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            <Trash2 />
            {confirmDelete ? "Toca de nuevo para confirmar" : "Eliminar categoría"}
          </Button>
        )}
        {confirmDelete && (
          <p className="text-center text-xs text-muted-foreground">
            Los movimientos de esta categoría se conservan como &quot;Sin categoría&quot;.
          </p>
        )}
      </div>
    </form>
  );
}
