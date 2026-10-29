"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelContactRequest,
  removeContact,
  respondContactRequest,
  sendContactRequest,
} from "@/lib/actions/contacts";
import type { ActionResult } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

function AddContactForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await sendContactRequest(email);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Solicitud enviada", {
        description: "Si esa persona usa Bingo, la verá en sus contactos.",
      });
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <Label htmlFor="contact-email">Email de tu contacto</Label>
        <Input
          id="contact-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@gmail.com"
          className="h-11 text-base"
          required
        />
      </div>
      <Button type="submit" disabled={pending || !email.trim()} className="h-11">
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Enviar solicitud
      </Button>
    </form>
  );
}

export function AddContactButton({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} className={cn("h-10", className)}>
        <Plus /> Agregar contacto
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Agregar contacto"
        description="Busca a la persona por el email con el que usa Bingo. Tiene que aceptar tu solicitud."
      >
        <AddContactForm onDone={() => setOpen(false)} />
      </ResponsiveSheet>
    </>
  );
}

/** Botón de ícono que ejecuta una acción del servidor y avisa el resultado. */
function IconAction({
  label,
  success,
  run,
  className,
  children,
}: {
  label: string;
  success: string;
  run: () => Promise<ActionResult>;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await run();
          if (res.ok) toast.success(success);
          else toast.error(res.error);
        })
      }
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-60",
        className,
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

/** Aceptar o rechazar una solicitud recibida. */
export function RequestActions({ id }: { id: string }) {
  return (
    <div className="flex gap-1.5">
      <IconAction
        label="Rechazar"
        success="Solicitud rechazada"
        run={() => respondContactRequest(id, false)}
        className="bg-muted text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </IconAction>
      <IconAction
        label="Aceptar"
        success="Contacto agregado"
        run={() => respondContactRequest(id, true)}
        className="bg-primary text-primary-foreground"
      >
        <Check className="size-4" />
      </IconAction>
    </div>
  );
}

export function CancelRequestButton({ id }: { id: string }) {
  return (
    <IconAction
      label="Cancelar solicitud"
      success="Solicitud cancelada"
      run={() => cancelContactRequest(id)}
      className="text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <X className="size-4" />
    </IconAction>
  );
}

/** Pide un segundo toque para confirmar antes de eliminar. */
export function RemoveContactButton({ uid }: { uid: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirm) {
    return (
      <button
        type="button"
        aria-label="Eliminar contacto"
        onClick={() => setConfirm(true)}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onBlur={() => setConfirm(false)}
      autoFocus
      onClick={() =>
        startTransition(async () => {
          const res = await removeContact(uid);
          if (res.ok) toast.success("Contacto eliminado");
          else toast.error(res.error);
          setConfirm(false);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : "Eliminar"}
    </Button>
  );
}
