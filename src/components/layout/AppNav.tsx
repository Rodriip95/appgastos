"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LayoutGrid, Menu, Shapes, Wallet, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Resumen", hint: "Balance y movimientos del mes", icon: LayoutGrid },
  { href: "/tarjetas", label: "Tarjetas", hint: "Cuotas y vencimientos", icon: CreditCard },
  { href: "/categorias", label: "Categorías", hint: "Organiza tus movimientos", icon: Shapes },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Navegación en el header (desktop). */
export function DesktopNav() {
  const isActive = useIsActive();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition",
            isActive(href)
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Menú lateral (mobile). `footer` llega del servidor con los datos del usuario,
 * así el botón del menú puede prerenderizarse sin esperar la sesión.
 */
export function SideMenu({ footer }: { footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="-ml-2 grid size-10 place-items-center rounded-full transition hover:bg-muted active:scale-95 md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <Drawer open={open} onOpenChange={setOpen} direction="left">
        <DrawerContent className="data-[vaul-drawer-direction=left]:w-[82%] data-[vaul-drawer-direction=left]:max-w-xs">
          <div className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Wallet className="size-4" />
                </span>
                <DrawerTitle className="text-base font-semibold tracking-tight">Mis Gastos</DrawerTitle>
              </div>
              <DrawerClose
                aria-label="Cerrar menú"
                className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
              >
                <X className="size-4" />
              </DrawerClose>
            </div>
            <DrawerDescription className="sr-only">Navegación principal</DrawerDescription>

            <nav aria-label="Principal" className="flex-1 space-y-1 px-2 py-2">
              {ITEMS.map(({ href, label, hint, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
                      active ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-lg",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-sm", active && "font-semibold")}>{label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 pb-3">
              <ThemeToggle />
            </div>
            {footer && <div className="border-t p-3">{footer}</div>}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
