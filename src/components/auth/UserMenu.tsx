"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Loader2, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase/client";
import { destroySession } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

function useSignOut() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await destroySession();
      await signOut(auth);
      router.replace("/login");
      router.refresh();
    });
  }

  return { pending, handleSignOut };
}

function Avatar({ user, className }: { user: SessionUser; className?: string }) {
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-sm font-medium",
        className,
      )}
    >
      {user.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.picture} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

/** Usuario + cerrar sesión, para el pie del menú lateral. */
export function UserCard({ user }: { user: SessionUser }) {
  const { pending, handleSignOut } = useSignOut();
  return (
    <div className="flex items-center gap-3">
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name ?? "Mi cuenta"}</p>
        {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        aria-label="Cerrar sesión"
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      </button>
    </div>
  );
}

export function UserMenu({ user }: { user: SessionUser }) {
  const { pending, handleSignOut } = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Menú de usuario"
      >
        <Avatar user={user} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{user.name ?? "Mi cuenta"}</p>
          {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleSignOut();
          }}
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
