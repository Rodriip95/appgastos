"use client";

import { useState, type ReactNode } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import { CardForm } from "@/components/cards/CardForm";
import type { CreditCard } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export function NewCardButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className={cn("h-10", className)}>
        <Plus /> Nueva tarjeta
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Nueva tarjeta"
        description="Con el cierre y el vencimiento calculamos en qué mes cae cada cuota."
      >
        <CardForm onDone={() => setOpen(false)} />
      </ResponsiveSheet>
    </>
  );
}

export function EditCardButton({ card, children }: { card: CreditCard; children?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Editar ${card.name}`}>
        <Pencil /> {children}
      </Button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Editar tarjeta">
        <CardForm card={card} onDone={() => setOpen(false)} />
      </ResponsiveSheet>
    </>
  );
}
