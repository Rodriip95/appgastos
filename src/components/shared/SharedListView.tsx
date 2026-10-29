import Link from "next/link";
import { Handshake } from "lucide-react";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { PersonAvatar } from "@/components/contacts/PersonAvatar";
import { InviteResponse, NewSpaceButton } from "@/components/shared/SharedSheets";
import { activeMembers, money, signedMoney } from "@/components/shared/shared-ui";
import type { SharedOverview } from "@/lib/data/shared";
import type { ExpenseCategory } from "@/lib/finance/defaults";
import type { Person } from "@/lib/finance/types";

type Props = SharedOverview & { contacts: Person[]; categories: ExpenseCategory[] };

/** Lista de espacios compartidos. Solo presentación: los datos llegan de `(app)/compartidos/page.tsx`. */
export function SharedListView({ spaces, invites, contacts, categories }: Props) {
  const empty = spaces.length === 0 && invites.length === 0;
  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos compartidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lo que pagan entre varios, como el auto, con su balance y su historial.
          </p>
        </div>
        {!empty && <NewSpaceButton contacts={contacts} categories={categories} />}
      </div>

      {empty && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-muted">
            <Handshake className="size-7 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Crea tu primer espacio</h2>
          <p className="mt-1 mb-6 max-w-sm text-sm text-muted-foreground">
            Uno por cada cosa que comparten: el auto, la casa, las salidas. Invita a un contacto y vayan
            cargando gastos.
          </p>
          <NewSpaceButton contacts={contacts} categories={categories} className="h-11" />
        </div>
      )}

      {invites.length > 0 && (
        <section aria-label="Invitaciones" className="rounded-3xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold">Invitaciones</h2>
          <ul className="mt-2 divide-y">
            {invites.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <CategoryIcon icon={s.icon} color={s.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {activeMembers(s.members)
                      .map((m) => m.name || m.email)
                      .join(", ")}
                  </p>
                </div>
                <InviteResponse id={s.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {spaces.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {spaces.map(({ space, total, mine }) => (
            <Link
              key={space.id}
              href={`/compartidos/${space.id}`}
              className="rounded-3xl border bg-card p-4 transition hover:bg-muted/40 active:scale-[0.99] sm:p-5"
            >
              <div className="flex items-center gap-3">
                <CategoryIcon icon={space.icon} color={space.color} />
                <p className="min-w-0 flex-1 truncate font-semibold">{space.name}</p>
                <div className="flex -space-x-2">
                  {activeMembers(space.members)
                    .slice(0, 4)
                    .map((m) => (
                      <PersonAvatar key={m.uid} person={m} className="size-7 border-2 border-card text-xs" />
                    ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">{money(total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">{signedMoney(mine)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
