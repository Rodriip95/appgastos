import Link from "next/link";
import { Target } from "lucide-react";
import { CATEGORY_COLORS, CategoryIcon } from "@/components/categories/CategoryIcon";
import { PersonAvatar } from "@/components/contacts/PersonAvatar";
import { InviteResponse, NewSpaceButton } from "@/components/shared/SharedSheets";
import { activeMembers, money } from "@/components/shared/shared-ui";
import type { SharedOverview } from "@/lib/data/shared";
import type { ExpenseCategory } from "@/lib/finance/defaults";
import type { Person } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Props = SharedOverview & { contacts: Person[]; categories: ExpenseCategory[] };

/** Lista de objetivos compartidos. Solo presentación: los datos llegan de `(app)/objetivos-compartidos/page.tsx`. */
export function GoalListView({ spaces, invites, contacts, categories }: Props) {
  const empty = spaces.length === 0 && invites.length === 0;
  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Objetivos compartidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Metas que juntan entre varios, con lo que aporta cada uno y en qué se destina.
          </p>
        </div>
        {!empty && <NewSpaceButton kind="goal" contacts={contacts} categories={categories} />}
      </div>

      {empty && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-muted">
            <Target className="size-7 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Crea tu primer objetivo</h2>
          <p className="mt-1 mb-6 max-w-sm text-sm text-muted-foreground">
            Unas vacaciones, un auto, una mudanza: definan cuánto juntar e inviten a un contacto para ir
            sumando aportes.
          </p>
          <NewSpaceButton kind="goal" contacts={contacts} categories={categories} className="h-11" />
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
          {spaces.map(({ space, total, mine }) => {
            const target = space.goal?.targetCents ?? 0;
            const pct = target > 0 ? Math.min((total / target) * 100, 100) : 0;
            return (
              <Link
                key={space.id}
                href={`/objetivos-compartidos/${space.id}`}
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
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">{money(total)}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    de {money(target)} · <span className="font-medium text-foreground">{Math.floor(pct)}%</span>
                  </p>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", CATEGORY_COLORS[space.color].solid)}
                    style={{ width: `${Math.max(pct, 1.5)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">Tú: {money(mine)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
