"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth, lastDayOfMonth, shiftMonth } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

type Mark = { appointments: number; deliveries: number };

/**
 * Grilla de un mes (lunes primero) con marcas por día: turnos (primario) y entregas (naranja).
 * Solo presentación; el día elegido y el mes los maneja quien la usa.
 */
export function MonthCalendar({
  month,
  today,
  selected,
  marks,
  onSelect,
  onMonth,
}: {
  /** YYYY-MM */
  month: string;
  today: string;
  selected: string;
  marks: Map<string, Mark>;
  onSelect: (date: string) => void;
  onMonth: (month: string) => void;
}) {
  const days = Number(lastDayOfMonth(month).slice(8));
  // getUTCDay: 0 = domingo → con lunes primero, el domingo es la columna 6.
  const offset = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  return (
    <section className="rounded-3xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onMonth(shiftMonth(month, -1))}
          aria-label="Mes anterior"
          className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            onMonth(today.slice(0, 7));
            onSelect(today);
          }}
          className="rounded-full px-3 py-1 font-semibold tracking-tight transition hover:bg-muted"
          title="Ir a hoy"
        >
          {formatMonth(month)}
        </button>
        <button
          type="button"
          onClick={() => onMonth(shiftMonth(month, 1))}
          aria-label="Mes siguiente"
          className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="pb-1 text-[11px] font-medium text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} />;
          const mark = marks.get(date);
          const isSelected = date === selected;
          const isToday = date === today;
          const total = (mark?.appointments ?? 0) + (mark?.deliveries ?? 0);
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-label={`${Number(date.slice(8))}${total ? `: ${total} en la agenda` : ""}`}
              className={cn(
                "flex aspect-square min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl text-sm tabular-nums transition",
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                !isSelected && isToday && "font-semibold ring-1 ring-primary",
                !isSelected && date < today && "text-muted-foreground",
              )}
            >
              {Number(date.slice(8))}
              <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
                {mark?.appointments ? (
                  <span
                    className={cn("size-1.5 rounded-full", isSelected ? "bg-primary-foreground" : "bg-primary")}
                  />
                ) : null}
                {mark?.deliveries ? <span className="size-1.5 rounded-full bg-brand-orange" /> : null}
                {total > 2 ? (
                  <span className={cn("text-[9px] leading-none", !isSelected && "text-muted-foreground")}>
                    {total}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 flex gap-4 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Turnos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-brand-orange" /> Entregas
        </span>
      </p>
    </section>
  );
}
