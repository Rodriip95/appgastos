"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setUsdReference } from "@/lib/actions/fx";
import { USD_REFERENCE_OPTIONS } from "@/lib/config";
import { rateLabel } from "@/lib/finance/currency";
import { cn } from "@/lib/utils";

/**
 * Selector chico del dólar de referencia (oficial, MEP, blue). Cambia la cotización con la
 * que se muestra el equivalente en pesos y la que se guarda en los próximos movimientos en USD.
 */
export function UsdReferencePicker({ value, className }: { value: string; className?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      value={value}
      disabled={pending}
      aria-label="Dólar de referencia"
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          const res = await setUsdReference(next);
          if (!res.ok) toast.error(res.error);
          else toast.success(`Ahora usamos el ${rateLabel(next)} como referencia`);
        });
      }}
      className={cn(
        "cursor-pointer rounded-md bg-transparent py-0.5 font-medium underline decoration-dotted underline-offset-2 outline-none disabled:opacity-60 [&>option]:text-foreground",
        className,
      )}
    >
      {USD_REFERENCE_OPTIONS.map((k) => (
        <option key={k} value={k}>
          {rateLabel(k)}
        </option>
      ))}
    </select>
  );
}
