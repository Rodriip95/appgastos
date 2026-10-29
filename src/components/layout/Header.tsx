import { Suspense } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { BingoMark, BingoWordmark } from "@/components/brand/Bingo";
import { UserCard, UserMenu } from "@/components/auth/UserMenu";
import { DesktopNav, SideMenu } from "@/components/layout/AppNav";
import { getSessionUser } from "@/lib/auth/session";
import { getPendingRequestCount } from "@/lib/data/contacts";

// Shell estático (se prerenderiza); lo dependiente de la sesión se transmite en streaming.
export function Header() {
  const contactsBadge = (
    <Suspense fallback={null}>
      <ContactsBadge />
    </Suspense>
  );
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2 md:gap-6">
          <SideMenu
            contactsBadge={contactsBadge}
            footer={
              <Suspense fallback={<Skeleton className="h-9 w-full rounded-full" />}>
                <MenuUser />
              </Suspense>
            }
          />
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-secondary">
              <BingoMark className="size-7" />
            </span>
            <BingoWordmark size="sm" />
          </Link>
          <DesktopNav contactsBadge={contactsBadge} />
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

/** Globito con las solicitudes de contacto pendientes; sin sesión no muestra nada. */
async function ContactsBadge() {
  if (!(await getSessionUser())) return null;
  const count = await getPendingRequestCount();
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} solicitudes pendientes`}
      className="grid min-w-5 place-items-center rounded-full bg-brand-orange px-1.5 text-xs font-semibold text-white"
    >
      {count}
    </span>
  );
}
