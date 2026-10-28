import Link from "next/link";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { formatMonth, formatMonthShort, shiftMonth } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

type Props = {
  month: string;
  currentMonth: string;
  /** Primer mes con movimientos; null si no hay ninguno */
  firstMonth: string | null;
};

const hrefFor = (month: string, currentMonth: string) =>
  month === currentMonth ? "/" : `/?m=${month}`;

export function MonthSwitcher({ month, currentMonth, firstMonth }: Props) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const canPrev = firstMonth !== null && prev >= firstMonth;
  const canNext = month < currentMonth;
  const isCurrent = month === currentMonth;

  return (
    <div className="space-y-2">
      <nav aria-label="Cambiar mes" className="flex items-center justify-between gap-2">
        <ArrowLink href={hrefFor(prev, currentMonth)} enabled={canPrev} label="Mes anterior">
          <ChevronLeft />
        </ArrowLink>
        <div className="text-center">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {isCurrent ? "Este mes" : "Historial"}
          </p>
          <h1 className="text-xl font-semibold tracking-tight">{formatMonth(month)}</h1>
        </div>
        <ArrowLink href={hrefFor(next, currentMonth)} enabled={canNext} label="Mes siguiente">
          <ChevronRight />
        </ArrowLink>
      </nav>
      {!isCurrent && (
        <div className="flex justify-center">
          <Link
            href="/"
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
