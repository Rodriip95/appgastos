"use client";

import { Children, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Cuántos elementos se ven antes de "Ver más" */
  limit: number;
  /** Qué se lista, para el botón: "Ver 3 {noun} más" (texto: llega desde Server Components) */
  noun?: string;
  lessLabel?: string;
  className?: string;
  /** Elementos de la lista (normalmente <li>) */
  children: ReactNode;
};

/**
 * Lista que muestra los primeros `limit` elementos y un botón para ver el resto.
 * Evita pantallas cargadas cuando hay muchas categorías o movimientos.
 */
export function CollapsibleList({
  limit,
  noun = "",
  lessLabel = "Ver menos",
  className,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  // Ocultar un solo elemento no ahorra espacio: se muestra todo.
  const hidden = items.length - limit >= 2 ? items.length - limit : 0;

  return (
    <>
      <ul className={className}>{expanded || hidden <= 0 ? items : items.slice(0, limit)}</ul>
      {hidden > 0 && (
        <ShowMoreButton
          expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          label={expanded ? lessLabel : `Ver ${hidden} ${noun ? `${noun} ` : ""}más`}
        />
      )}
    </>
  );
}

export function ShowMoreButton({
  expanded,
  label,
  onClick,
  className,
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn(
        "mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {label}
      <ChevronDown className={cn("size-4 transition", expanded && "rotate-180")} />
    </button>
  );
}
