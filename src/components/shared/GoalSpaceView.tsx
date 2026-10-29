import Link from "next/link";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, History, Trophy } from "lucide-react";
import { CATEGORY_COLORS, CategoryIcon } from "@/components/categories/CategoryIcon";
import { CollapsibleList } from "@/components/common/CollapsibleList";
import { PersonAvatar } from "@/components/contacts/PersonAvatar";
import {
  AddContributionButton,
  DeleteEntryButton,
  SpaceSettingsButton,
  type SummaryLink,
} from "@/components/shared/SharedSheets";
import { activeMembers, firstName, money, toneAt } from "@/components/shared/shared-ui";
import type { SharedDetail } from "@/lib/data/shared";
import { formatDayLabel, formatMoney, formatMonth } from "@/lib/finance/format";
import { goalPlan } from "@/lib/finance/goals";
import { computeGoalProgress, fromCents, progressByConcept } from "@/lib/finance/shared";
import type { ExpenseCategory } from "@/lib/finance/defaults";
import type { Person } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Props = SharedDetail & {
  contacts: Person[];
  today: string;
  link: SummaryLink;
  expenseCategories: ExpenseCategory[];
};

/** Detalle de un objetivo compartido: avance, aportes por persona y por concepto, historial. */
export function GoalSpaceView({ space, entries, me, contacts, today, link, expenseCategories }: Props) {
  const members = activeMembers(space.members);
  const uids = space.members.map((m) => m.uid);
  const progress = computeGoalProgress(entries, uids);
  const byConcept = progressByConcept(entries, uids);
  const memberOf = new Map(space.members.map((m) => [m.uid, m]));
  const conceptName = new Map(space.subcategories.map((s) => [s.id, s.name]));

  const target = space.goal?.targetCents ?? 0;
  const targetDate = space.goal?.targetDate ?? null;
  const pct = target > 0 ? Math.min((progress.saved / target) * 100, 100) : 0;
  const plan = goalPlan(
    {
      id: space.id,
      name: space.name,
      icon: space.icon,
      color: space.color,
      saved: fromCents(progress.saved),
      target: fromCents(target),
      targetDate,
    },
    today,
  );
  const remaining = Math.max(target - progress.saved, 0);
  // Quienes aportaron algo; los que se fueron figuran mientras tengan aportes.
  const contributors = space.members.filter((m) => m.status === "accepted" || (progress.people[m.uid] ?? 0) !== 0);

  return (
    <main className="space-y-5">
      <Link
        href="/objetivos-compartidos"
        className="-ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Objetivos
      </Link>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <CategoryIcon icon={space.icon} color={space.color} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{space.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex -space-x-2">
                {members.map((m) => (
                  <PersonAvatar key={m.uid} person={m} className="size-7 border-2 border-background text-xs" />
                ))}
              </div>
              {targetDate && (
                <span className="text-xs text-muted-foreground">{formatMonth(targetDate.slice(0, 7))}</span>
              )}
            </div>
          </div>
          <SpaceSettingsButton
            space={space}
            me={me}
            contacts={contacts}
            link={link}
            expenseCategories={expenseCategories}
          />
        </div>
        {/* El botón va en su propia fila: en el celular el título no entra junto a él */}
        <div className="flex gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
          <AddContributionButton space={space} members={members} me={me} saved={progress.saved} />
        </div>
      </div>

      <section aria-label="Avance" className="rounded-3xl border bg-card p-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-4xl font-semibold tracking-tight tabular-nums">{money(progress.saved)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            de {money(target)} · <span className="font-medium text-foreground">{Math.floor(pct)}%</span>
          </p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", CATEGORY_COLORS[space.color].solid)}
            style={{ width: `${Math.max(pct, 1.5)}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Falta</p>
            <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold tabular-nums">
              {plan.kind === "done" && <Trophy className="size-4" />}
              {money(remaining)}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Por mes</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {plan.kind === "monthly" ? formatMoney(plan.perMonth) : "—"}
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Por persona" className="rounded-3xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Por persona</h2>
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
          {contributors.map((m, i) => (
            <div
              key={m.uid}
              className={toneAt(i).dot}
              style={{ width: `${progress.saved > 0 ? (Math.max(progress.people[m.uid] ?? 0, 0) / progress.saved) * 100 : 0}%` }}
            />
          ))}
        </div>
        <ul className="mt-1 divide-y">
          {contributors.map((m, i) => {
            const cents = progress.people[m.uid] ?? 0;
            const share = progress.saved > 0 ? Math.round((cents / progress.saved) * 100) : 0;
            return (
              <li key={m.uid} className="flex items-center gap-3 py-2.5">
                <span className={cn("size-2.5 shrink-0 rounded-full", toneAt(i).dot)} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {m.uid === me ? "Tú" : firstName(m)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{share}%</span>
                <span className="w-28 text-right text-sm font-semibold tabular-nums">{money(cents)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {byConcept.length > 0 && (
        <section aria-label="Por concepto" className="rounded-3xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold">Por concepto</h2>
          <ul className="mt-2 divide-y">
            {byConcept.map((row) => {
              const name = (row.subcategoryId && conceptName.get(row.subcategoryId)) || "Sin concepto";
              return (
                <li key={row.subcategoryId ?? "none"} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">{name}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{money(row.saved)}</p>
                  </div>
                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
                    {contributors.map((m, i) => (
                      <div
                        key={m.uid}
                        className={toneAt(i).dot}
                        style={{ width: `${(Math.max(row.people[m.uid] ?? 0, 0) / row.saved) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
                    {contributors.map((m, i) => (
                      <span key={m.uid} className="inline-flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-full", toneAt(i).dot)} />
                        {money(row.people[m.uid] ?? 0)}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="Historial" className="rounded-3xl border bg-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <History className="size-4 text-muted-foreground" /> Historial
        </h2>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no hay aportes. Usa <strong className="font-medium text-foreground">Aporte</strong> para sumar
            el primero.
          </p>
        ) : (
          <CollapsibleList limit={10} noun="movimientos" className="mt-2 divide-y">
            {entries.map((e) => {
              const deposit = e.type === "deposit";
              const who = memberOf.get(e.paidBy);
              const concept = e.subcategoryId ? conceptName.get(e.subcategoryId) : null;
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="relative">
                    {who ? (
                      <PersonAvatar person={who} className="size-9" />
                    ) : (
                      <span className="grid size-9 place-items-center rounded-full bg-muted">?</span>
                    )}
                    <span
                      className={cn(
                        "absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border-2 border-card text-white",
                        deposit ? "bg-emerald-500" : "bg-rose-500",
                      )}
                    >
                      {deposit ? <ArrowDownLeft className="size-2.5" /> : <ArrowUpRight className="size-2.5" />}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.note || concept || (deposit ? "Aporte" : "Retiro")}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[formatDayLabel(e.date, today), who ? (who.uid === me ? "Tú" : firstName(who)) : null, e.note ? concept : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      deposit && "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {deposit ? "+" : "−"}
                    {money(e.amountCents)}
                  </span>
                  {e.createdBy === me ? (
                    <DeleteEntryButton spaceId={space.id} entryId={e.id} />
                  ) : (
                    <span className="size-8 shrink-0" />
                  )}
                </li>
              );
            })}
          </CollapsibleList>
        )}
      </section>
    </main>
  );
}
