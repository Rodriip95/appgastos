import Link from "next/link";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { formatMonth, formatMonthShort, shiftMonth } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

type Props = {
  month: string;
  currentMonth: string;
  /** Primer mes con movimientos; null si no hay ninguno */
  firstMonth: string | null;
  /** Meses posteriores al actual con movimientos, en orden */
  futureMonths: string[];
  /** Página donde se navega (la home o Mi negocio) */
  basePath?: string;
};

export function MonthSwitcher({ month, currentMonth, firstMonth, futureMonths, basePath = "/" }: Props) {
  const hrefFor = (m: string) => (m === currentMonth ? `${basePath}?v=mes` : `${basePath}?m=${m}`);
  // Hacia adelante del mes actual solo se pasa por meses con movimientos.
  const isFuture = month > currentMonth;
  const prev = isFuture
    ? (futureMonths.findLast((m) => m < month) ?? currentMonth)
    : shiftMonth(month, -1);
  const next =
    month < currentMonth ? shiftMonth(month, 1) : futureMonths.find((m) => m > month);
  const canPrev = isFuture || (firstMonth !== null && prev >= firstMonth);
  const isCurrent = month === currentMonth;

  return (
    <div className="space-y-2">
      <nav aria-label="Cambiar mes" className="flex items-center justify-between gap-2">
        <ArrowLink href={hrefFor(prev)} enabled={canPrev} label="Mes anterior">
          <ChevronLeft />
        </ArrowLink>
        <div className="text-center">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {isCurrent ? "Este mes" : isFuture ? "Próximo" : "Historial"}
          </p>
          <h1 className="text-xl font-semibold tracking-tight">{formatMonth(month)}</h1>
        </div>
        <ArrowLink href={hrefFor(next ?? currentMonth)} enabled={!!next} label="Mes siguiente">
          <ChevronRight />
        </ArrowLink>
      </nav>
      {!isCurrent && (
        <div className="flex justify-center">
          <Link
            href={`${basePath}?v=mes`}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <RotateCcw className="size-3" /> Volver a {formatMonthShort(currentMonth)}
          </Link>
        </div>
      )}
    </div>
  );
}

function ArrowLink({
  href,
  enabled,
  label,
  children,
}: {
  href: string;
  enabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "grid size-11 place-items-center rounded-full border bg-card transition [&_svg]:size-5",
    enabled ? "hover:bg-muted active:scale-95" : "pointer-events-none opacity-30",
  );
  if (!enabled) {
    return (
      <span className={className} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} aria-label={label} scroll={false}>
      {children}
    </Link>
  );
}
