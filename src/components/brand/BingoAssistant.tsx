"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import { BingoDog } from "@/components/brand/Bingo";
import type { BingoMessage, BingoTone } from "@/lib/finance/bingo";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "bingo-dismissed";

// Lo cerrado vive en sessionStorage: los avisos vuelven en la próxima sesión del navegador.
const listeners = new Set<() => void>();

function readDismissed(): string {
  try {
    return sessionStorage.getItem(DISMISS_KEY) ?? "[]";
  } catch {
    return "[]"; // Sin acceso al storage: se muestra todo.
  }
}

function dismissId(id: string) {
  try {
    const ids: string[] = JSON.parse(readDismissed());
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...ids, id]));
  } catch {
    // Ignorado: solo afecta a que el aviso vuelva a mostrarse.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const TONES: Record<BingoTone, string> = {
  good: "bg-secondary text-secondary-foreground",
  info: "bg-secondary text-secondary-foreground",
  warn: "bg-amber-100 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100",
  alert: "bg-rose-100 text-rose-950 dark:bg-rose-500/15 dark:text-rose-100",
};

/**
 * Bingo como asistente de la billetera: muestra un consejo a la vez (el más urgente
 * primero) y deja pasar al siguiente. El perro ocupa el borde del contenedor sin
 * márgenes; solo el texto lleva padding.
 */
export function BingoAssistant({ messages }: { messages: BingoMessage[] }) {
  const [index, setIndex] = useState(0);
  const dismissedRaw = useSyncExternalStore(subscribe, readDismissed, () => "[]");

  const dismissed = new Set<string>(JSON.parse(dismissedRaw));
  const visible = messages.filter((m) => !dismissed.has(m.id));
  if (visible.length === 0) return null;

  const current = visible[index % visible.length];

  return (
    <section
      role="status"
      aria-label="Bingo"
      className={cn("flex items-end overflow-hidden rounded-3xl transition-colors", TONES[current.tone])}
    >
      <BingoDog
        variant={current.variant}
        title="Bingo"
        className="-mb-1 -ml-1 w-24 shrink-0 self-end sm:w-28"
      />
      <div className="flex min-w-0 flex-1 items-start gap-1.5 self-center px-2.5 py-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm leading-snug font-medium">{current.text}</p>
          {current.href && (
            <Link
              href={current.href}
              className="inline-block text-xs font-semibold underline underline-offset-4"
            >
              {current.cta ?? "Ver"}
            </Link>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-center">
          {current.dismissible && (
            <button
              type="button"
              onClick={() => dismissId(current.id)}
              aria-label="Cerrar consejo"
              className="grid size-7 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="size-3.5" />
            </button>
          )}
          {visible.length > 1 && (
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % visible.length)}
              aria-label={`Siguiente consejo (${(index % visible.length) + 1} de ${visible.length})`}
              className="flex h-7 items-center rounded-full px-1 text-[10px] font-semibold tabular-nums transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              {(index % visible.length) + 1}/{visible.length}
              <ChevronRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
