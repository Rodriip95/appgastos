"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { addDefaultCategories } from "@/lib/actions/categories";
import type { Category, TxType } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const typeLabel = (type: TxType) => (type === "income" ? "ingreso" : "gasto");

/** Subcategorías visibles en la tarjeta; el resto se resume como "+N". */
const MAX_CHIPS = 4;

/** Tarjeta de categoría; al tocarla se abre el editor. */
export function CategoryCard({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left transition hover:bg-muted/50 active:scale-[0.99]"
      >
        <CategoryIcon icon={category.icon} color={category.color} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{category.name}</p>
          {category.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
          )}
          {category.subcategories.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {category.subcategories.slice(0, MAX_CHIPS).map((s) => (
                <span key={s.id} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {s.name}
                </span>
              ))}
              {category.subcategories.length > MAX_CHIPS && (
                <span className="rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground">
                  +{category.subcategories.length - MAX_CHIPS}
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Editar categoría">
        <CategoryForm type={category.type} category={category} onDone={() => setOpen(false)} />
      </ResponsiveSheet>
    </>
  );
}

export function NewCategoryButton({ type, className }: { type: TxType; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className={cn("h-10", className)}>
        <Plus /> Nueva categoría
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title={`Nueva categoría de ${typeLabel(type)}`}
        description="Agrégale subcategorías para ver el detalle de en qué se va tu plata."
      >
        <CategoryForm type={type} onDone={() => setOpen(false)} />
      </ResponsiveSheet>
    </>
  );
}

export function AddDefaultsButton({
  variant = "default",
  className,
}: {
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={variant}
      className={cn("h-10", className)}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await addDefaultCategories();
          if (!res.ok) toast.error(res.error);
          else if (!res.added) toast.info("Ya tienes todas las categorías sugeridas");
          else toast.success(`Agregamos ${res.added} categorías sugeridas`);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      Usar categorías sugeridas
    </Button>
  );
}
