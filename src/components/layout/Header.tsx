import { Suspense } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCard, UserMenu } from "@/components/auth/UserMenu";
import { DesktopNav, SideMenu } from "@/components/layout/AppNav";
import { getSessionUser } from "@/lib/auth/session";

// Shell estático (se prerenderiza); lo dependiente de la sesión se transmite en streaming.
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2 md:gap-6">
          <SideMenu
            footer={
              <Suspense fallback={<Skeleton className="h-9 w-full rounded-full" />}>
                <MenuUser />
              </Suspense>
            }
          />
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Wallet className="size-4" />
            </span>
            Mis Gastos
          </Link>
          <DesktopNav />
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
