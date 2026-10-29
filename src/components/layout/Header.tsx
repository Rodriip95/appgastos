import { Suspense } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { BingoMark, BingoWordmark } from "@/components/brand/Bingo";
import { UserCard, UserMenu } from "@/components/auth/UserMenu";
import {
  DataResetDesktopLink,
  DataResetMenuLink,
  DesktopNav,
  SideMenu,
} from "@/components/layout/AppNav";
import { getSessionUser } from "@/lib/auth/session";
import { getPendingRequestCount } from "@/lib/data/contacts";
import { getPendingInviteCount } from "@/lib/data/shared";
import { getFlags, type Flags } from "@/lib/flags";

// Shell estático (se prerenderiza); lo dependiente de la sesión se transmite en streaming.
export function Header() {
  const badges = {
    "/contactos": (
      <Suspense fallback={null}>
        <CountBadge load={getPendingRequestCount} label="solicitudes pendientes" />
      </Suspense>
    ),
    "/compartidos": (
      <Suspense fallback={null}>
        <CountBadge load={() => getPendingInviteCount("expenses")} label="invitaciones pendientes" />
      </Suspense>
    ),
    "/objetivos-compartidos": (
      <Suspense fallback={null}>
        <CountBadge load={() => getPendingInviteCount("goal")} label="invitaciones pendientes" />
      </Suspense>
    ),
  };
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2 md:gap-6">
          {/* usePathname() es dato de runtime en rutas dinámicas: va dentro de Suspense */}
          <Suspense fallback={<span className="size-10 md:hidden" />}>
            <SideMenu
              badges={badges}
              extra={
                <Suspense fallback={null}>
                  <FlagGate flag="dataReset">
                    <DataResetMenuLink />
                  </FlagGate>
                </Suspense>
              }
              footer={
                <Suspense fallback={<Skeleton className="h-9 w-full rounded-full" />}>
                  <MenuUser />
                </Suspense>
              }
            />
          </Suspense>
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-secondary">
              <BingoMark className="size-7" />
            </span>
            <BingoWordmark size="sm" />
          </Link>
          <Suspense fallback={null}>
            <DesktopNav
              badges={badges}
              extra={
                <Suspense fallback={null}>
                  <FlagGate flag="dataReset">
                    <DataResetDesktopLink />
                  </FlagGate>
                </Suspense>
              }
            />
          </Suspense>
        </div>
        <Suspense fallback={<Skeleton className="size-9 rounded-full" />}>
          <HeaderUser />
        </Suspense>
      </div>
    </header>
  );
}

async function HeaderUser() {
  const user = await getSessionUser();
  return user ? <UserMenu user={user} /> : null;
}

async function MenuUser() {
  const user = await getSessionUser();
  return user ? <UserCard user={user} /> : null;
}

/** Globito con una cantidad pendiente; sin sesión o en cero no muestra nada. */
async function CountBadge({ load, label }: { load: () => Promise<number>; label: string }) {
  if (!(await getSessionUser())) return null;
  const count = await load();
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} ${label}`}
      className="grid min-w-5 place-items-center rounded-full bg-brand-orange px-1.5 text-xs font-semibold text-white"
    >
      {count}
    </span>
  );
}

/** Muestra `children` solo si el flag de Remote Config está encendido para quien tiene la sesión. */
async function FlagGate({ flag, children }: { flag: keyof Flags; children: React.ReactNode }) {
  return (await getFlags())[flag] ? children : null;
}
