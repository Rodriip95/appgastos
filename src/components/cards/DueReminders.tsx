"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { formatMoney, formatShortDate } from "@/lib/finance/format";
import type { UpcomingDue } from "@/lib/finance/cards";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "due-reminders-dismissed";

// Lo cerrado vive en sessionStorage: el aviso vuelve en la próxima sesión del navegador.
const listeners = new Set<() => void>();

function readDismissed(): string | null {
  try {
    return sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null; // Sin acceso al storage: se muestra siempre.
  }
}

function writeDismissed(value: string) {
  try {
    sessionStorage.setItem(DISMISS_KEY, value);
  } catch {
    // Ignorado: solo afecta a que el aviso vuelva a mostrarse.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const whenLabel = (daysLeft: number) =>
  daysLeft === 0 ? "vence hoy" : daysLeft === 1 ? "vence mañana" : `vence en ${daysLeft} días`;

/**
 * Aviso de vencimientos de tarjetas que se muestra al entrar. Se puede cerrar;
 * vuelve a aparecer en la próxima sesión del navegador o si cambian los vencimientos.
 */
export function DueReminders({ dues }: { dues: UpcomingDue[] }) {
  // Firma de lo que se avisa: si aparece un vencimiento nuevo, el aviso vuelve.
  const signature = dues.map((d) => `${d.card.id}:${d.date}`).join("|");
  // En el servidor se asume cerrado para no mostrar un aviso que el cliente oculte al hidratar.
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed() === signature,
    () => true,
  );

  if (dues.length === 0 || dismissed) return null;

  const dismiss = () => writeDismissed(signature);

  const urgent = dues.some((d) => d.daysLeft <= 2);

  return (
    <section
      role="status"
      aria-label="Vencimientos próximos"
      className={cn(
        "relative rounded-2xl border p-4 pr-12 text-sm",
        urgent
          ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
      )}
    >
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 space-y-1.5">
          <p className="font-semibold">
            {dues.length === 1 ? "Tienes un vencimiento cerca" : "Tienes vencimientos cerca"}
          </p>
          <ul className="space-y-1">
            {dues.map((d) => (
              <li key={d.card.id}>
                <strong className="font-medium">{d.card.name}</strong> {whenLabel(d.daysLeft)} (
                {formatShortDate(d.date)})
                {d.amount > 0 ? (
                  <>
                    : <span className="font-semibold tabular-nums">{formatMoney(d.amount)}</span> en cuotas
                    cargadas
                  </>
                ) : (
                  ". Revisa el resumen"
                )}
              </li>
            ))}
          </ul>
          <Link href="/tarjetas" className="inline-block font-medium underline underline-offset-4">
            Ver tarjetas
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="absolute top-3 right-3 grid size-8 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X className="size-4" />
      </button>
    </section>
  );
}
