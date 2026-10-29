"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/demo", label: "Resumen", icon: LayoutGrid },
  { href: "/demo/ahorros", label: "Ahorros", icon: PiggyBank },
] as const;

/** Pestañas de la demo (la app real usa el menú lateral). */
export function DemoNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de la demo" className="grid grid-cols-2 rounded-xl bg-muted p-1 sm:w-72">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm transition",
              active ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
