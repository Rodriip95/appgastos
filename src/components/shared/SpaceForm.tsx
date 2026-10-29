"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_COLORS, CATEGORY_ICONS, CategoryIcon } from "@/components/categories/CategoryIcon";
import { PersonAvatar } from "@/components/contacts/PersonAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSharedSpace, inviteToSharedSpace, updateSharedSpace } from "@/lib/actions/shared";
import { COLOR_KEYS, type ColorKey, type IconKey } from "@/lib/finance/catalog";
import type { Person, SharedSpace } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const SPACE_ICONS: IconKey[] = [
  "car",
  "house",
  "plane",
  "wallet",
  "shopping-cart",
  "utensils",
  "paw-print",
  "baby",
  "wrench",
  "gift",
  "heart-pulse",
  "receipt",
];

const SUGGESTED_SUBS = ["Nafta", "Service", "Seguro", "Patente", "Lavado"];

/** Lista de contactos con casillas para elegir a quién invitar. */
export function ContactPicker({
  contacts,
  selected,
  onChange,
}: {
  contacts: Person[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  if (contacts.length === 0) {
    return (
      <p className="rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">
        No hay contactos para invitar. Agrégalos en{" "}
        <Link href="/contactos" className="font-medium text-foreground underline underline-offset-2">
          Contactos
        </Link>
        .
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-2xl border">
      {contacts.map((c) => {
        const on = selected.has(c.uid);
        return (
          <li key={c.uid}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => {
                const next = new Set(selected);
                if (on) next.delete(c.uid);
                else next.add(c.uid);
                onChange(next);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/50"
            >
              <PersonAvatar person={c} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.name || c.email}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
              </span>
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-md border",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {on && <Check className="size-3.5" />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Invitar contactos a un espacio que ya existe. */
export function InviteSection({ spaceId, contacts }: { spaceId: string; contacts: Person[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-3">
      <ContactPicker contacts={contacts} selected={selected} onChange={setSelected} />
      {contacts.length > 0 && (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          disabled={pending || selected.size === 0}
          onClick={() =>
            startTransition(async () => {
              const res = await inviteToSharedSpace(spaceId, [...selected]);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success("Invitación enviada");
              setSelected(new Set());
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Invitar
        </Button>
      )}
    </div>
  );
}

type Props = {
  space?: SharedSpace;
  /** Contactos a quienes invitar al crear */
  contacts: Person[];
  onDone: () => void;
};

export function SpaceForm({ space, contacts, onDone }: Props) {
  const [name, setName] = useState(space?.name ?? "");
  const [icon, setIcon] = useState<IconKey>(space?.icon ?? "car");
  const [color, setColor] = useState<ColorKey>(space?.color ?? "sky");
  const [subs, setSubs] = useState<{ id?: string; name: string }[]>(space?.subcategories ?? []);
  const [invite, setInvite] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const setSub = (i: number, value: string) =>
    setSubs((list) => list.map((s, j) => (j === i ? { ...s, name: value } : s)));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subcategories = subs.filter((s) => s.name.trim());
    startTransition(async () => {
      const input = { name, icon, color, subcategories };
      const res = space
        ? await updateSharedSpace(space.id, input)
        : await createSharedSpace(input, [...invite]);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(space ? "Cambios guardados" : "Espacio creado");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size="lg" />
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="space-name">Nombre</Label>
          <Input
            id="space-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Auto"
            maxLength={40}
            autoComplete="off"
            className="h-11 text-base"
            required
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ícono</legend>
        <div className="grid grid-cols-6 gap-2">
          {SPACE_ICONS.map((key) => {
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

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Subcategorías</legend>
        <div className="space-y-2">
          {subs.map((s, i) => (
            <div key={s.id ?? i} className="flex items-center gap-2">
              <Input
                value={s.name}
                onChange={(e) => setSub(i, e.target.value)}
                maxLength={30}
                aria-label={`Subcategoría ${i + 1}`}
                className="h-10"
              />
              <button
                type="button"
                aria-label="Quitar subcategoría"
                onClick={() => setSubs((list) => list.filter((_, j) => j !== i))}
                className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => setSubs((list) => [...list, { name: "" }])}
        >
          <Plus /> Agregar
        </Button>
        {!space && subs.length === 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTED_SUBS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSubs((list) => [...list, { name: n }])}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted"
              >
                + {n}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {!space && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Invitar</legend>
          <ContactPicker contacts={contacts} selected={invite} onChange={setInvite} />
        </fieldset>
      )}

      <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {space ? "Guardar cambios" : "Crear espacio"}
      </Button>
    </form>
  );
}
