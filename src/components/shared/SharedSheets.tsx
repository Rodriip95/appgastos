"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Check, Loader2, LogOut, Plus, Settings2, Trash2, Undo2, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveSheet } from "@/components/common/ResponsiveSheet";
import { PersonAvatar } from "@/components/contacts/PersonAvatar";
import { ContributionForm, ExpenseForm, SettlementForm } from "@/components/shared/EntryForms";
import { InviteSection, SpaceForm } from "@/components/shared/SpaceForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteSharedEntry,
  deleteSharedSpace,
  leaveSharedSpace,
  removeSharedMember,
  respondSharedInvite,
  setSharedLink,
} from "@/lib/actions/shared";
import type { ActionResult, Person, SharedMember, SharedSpace } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export function NewSpaceButton({
  kind = "expenses",
  contacts,
  className,
  variant = "default",
}: {
  kind?: SharedSpace["kind"];
  contacts: Person[];
  className?: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} className={cn("h-10", className)}>
        <Plus /> {kind === "goal" ? "Nuevo objetivo" : "Nuevo espacio"}
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title={kind === "goal" ? "Nuevo objetivo compartido" : "Nuevo espacio compartido"}
        description={
          kind === "goal"
            ? "Una meta para juntar entre varios, como unas vacaciones. Las personas invitadas deben aceptar."
            : "Un lugar para los gastos que comparten, como el auto. Las personas invitadas deben aceptar."
        }
      >
        <SpaceForm kind={kind} contacts={contacts} onDone={() => setOpen(false)} />
      </ResponsiveSheet>
    </>
  );
}

type EntryButtonProps = {
  space: SharedSpace;
  /** Participantes activos */
  members: SharedMember[];
  me: string;
};

export function AddExpenseButton({ space, members, me }: EntryButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10">
        <Plus /> Gasto
      </Button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Nuevo gasto" description={space.name}>
        <ExpenseForm space={space} members={members} me={me} onDone={() => setOpen(false)} />
      </ResponsiveSheet>
    </>
  );
}

export function AddContributionButton({ space, members, me, saved }: EntryButtonProps & { saved: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10">
        <Plus /> Aporte
      </Button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Aportar o retirar" description={space.name}>
        <ContributionForm space={space} members={members} me={me} saved={saved} onDone={() => setOpen(false)} />
      </ResponsiveSheet>
    </>
  );
}

export function AddSettlementButton({ space, members, me, myNet }: EntryButtonProps & { myNet: number }) {
  const [open, setOpen] = useState(false);
  if (members.length < 2) return null;
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="h-10">
        <ArrowLeftRight /> Pago
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Registrar pago"
        description="Una transferencia entre participantes para equilibrar el balance. No cuenta como gasto."
      >
        <SettlementForm
          spaceId={space.id}
          members={members}
          me={me}
          myNet={myNet}
          onDone={() => setOpen(false)}
        />
      </ResponsiveSheet>
    </>
  );
}

export function DeleteEntryButton({ spaceId, entryId }: { spaceId: string; entryId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label="Eliminar movimiento"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await deleteSharedEntry(spaceId, entryId);
          if (res.ok) toast.success("Movimiento eliminado");
          else toast.error(res.error);
        })
      }
      className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
    </button>
  );
}

/** Aceptar o rechazar una invitación a un espacio. */
export function InviteResponse({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const respond = (accept: boolean) =>
    startTransition(async () => {
      const res = await respondSharedInvite(id, accept);
      if (!res.ok) toast.error(res.error);
      else toast.success(accept ? "Te uniste al espacio" : "Invitación rechazada");
    });
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        aria-label="Rechazar"
        disabled={pending}
        onClick={() => respond(false)}
        className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground disabled:opacity-60"
      >
        <X className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Aceptar"
        disabled={pending}
        onClick={() => respond(true)}
        className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      </button>
    </div>
  );
}

/** Botón que pide un segundo toque antes de ejecutar una acción destructiva. */
function ConfirmButton({
  label,
  icon,
  run,
  onSuccess,
}: {
  label: string;
  icon: React.ReactNode;
  run: () => Promise<ActionResult>;
  onSuccess: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={confirm ? "destructive" : "ghost"}
      className="h-11 w-full text-muted-foreground data-[variant=destructive]:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm) {
          setConfirm(true);
          return;
        }
        startTransition(async () => {
          const res = await run();
          if (res.ok) onSuccess();
          else toast.error(res.error);
          setConfirm(false);
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : icon}
      {confirm ? "Toca de nuevo para confirmar" : label}
    </Button>
  );
}

/** Mi vínculo con el resumen personal: null = no suma. */
export type SummaryLink = { categoryId: string | null } | null;

type SettingsProps = {
  space: SharedSpace;
  me: string;
  /** Mis contactos */
  contacts: Person[];
  link: SummaryLink;
  /** Mis categorías de gasto, para elegir dónde cae mi parte */
  expenseCategories: { id: string; name: string }[];
};

/** Interruptor para sumar mi parte de este espacio al resumen mensual personal. */
function SummaryLinkSection({
  spaceId,
  kind,
  link,
  categories,
}: {
  spaceId: string;
  kind: SharedSpace["kind"];
  link: SummaryLink;
  categories: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const enabled = link !== null;
  const save = (on: boolean, categoryId: string | null) =>
    startTransition(async () => {
      const res = await setSharedLink(spaceId, on, categoryId);
      if (!res.ok) toast.error(res.error);
    });

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">En mi resumen</h3>
          <p className="text-xs text-muted-foreground">
            {kind === "goal" ? "Mis aportes cuentan como dinero apartado." : "Mi parte de cada gasto cuenta en mis gastos del mes."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Sumar a mi resumen"
          disabled={pending}
          onClick={() => save(!enabled, link?.categoryId ?? null)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60",
            enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
              enabled && "translate-x-5",
            )}
          />
        </button>
      </div>
      {enabled && kind === "expenses" && (
        <select
          aria-label="Categoría de mi parte"
          value={link?.categoryId ?? ""}
          disabled={pending}
          onChange={(e) => save(true, e.target.value || null)}
          className="h-11 w-full rounded-lg border bg-background px-3 text-base"
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </section>
  );
}

/** Ajustes del espacio: datos, participantes, invitaciones y salida. */
export function SpaceSettingsButton({ space, me, contacts, link, expenseCategories }: SettingsProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const owner = space.createdBy === me;
  const listPath = space.kind === "goal" ? "/objetivos-compartidos" : "/compartidos";
  const present = new Set(space.members.filter((m) => m.status !== "left").map((m) => m.uid));
  const invitable = contacts.filter((c) => !present.has(c.uid));
  const leave = () => {
    toast.success("Saliste");
    router.replace(listPath);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Ajustes del espacio"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-full border text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <Settings2 className="size-4" />
      </button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Ajustes" description={space.name}>
        <div className="flex flex-col gap-7">
          <SpaceForm space={space} contacts={contacts} onDone={() => setOpen(false)} />

          <SummaryLinkSection spaceId={space.id} kind={space.kind} link={link} categories={expenseCategories} />

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Participantes</h3>
            <ul className="divide-y">
              {space.members
                .filter((m) => m.status !== "left")
                .map((m) => (
                  <MemberRow key={m.uid} spaceId={space.id} member={m} me={me} canRemove={owner && m.uid !== me} />
                ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Invitar</h3>
            <InviteSection spaceId={space.id} contacts={invitable} />
          </section>

          <div className="space-y-1 border-t pt-4">
            <ConfirmButton label="Salir" icon={<LogOut />} run={() => leaveSharedSpace(space.id)} onSuccess={leave} />
            {owner && (
              <ConfirmButton
                label="Eliminar"
                icon={<Trash2 />}
                run={() => deleteSharedSpace(space.id)}
                onSuccess={() => {
                  toast.success("Eliminado");
                  router.replace(listPath);
                }}
              />
            )}
          </div>
        </div>
      </ResponsiveSheet>
    </>
  );
}

function MemberRow({
  spaceId,
  member,
  me,
  canRemove,
}: {
  spaceId: string;
  member: SharedMember;
  me: string;
  canRemove: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-center gap-3 py-2">
      <PersonAvatar person={member} className="size-9" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {member.uid === me ? "Tú" : member.name || member.email}
      </span>
      {member.status === "pending" && <Badge variant="secondary">Pendiente</Badge>}
      {canRemove && (
        <button
          type="button"
          aria-label="Quitar del espacio"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await removeSharedMember(spaceId, member.uid);
              if (!res.ok) toast.error(res.error);
            })
          }
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-destructive"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
        </button>
      )}
    </li>
  );
}
