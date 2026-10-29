import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, History, Receipt } from "lucide-react";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { CollapsibleList } from "@/components/common/CollapsibleList";
import { PersonAvatar } from "@/components/contacts/PersonAvatar";
import { BalanceBeam } from "@/components/shared/BalanceBeam";
import {
  AddExpenseButton,
  AddSettlementButton,
  DeleteEntryButton,
  SpaceSettingsButton,
  type SummaryLink,
} from "@/components/shared/SharedSheets";
import { activeMembers, firstName, money, signedMoney, toneAt } from "@/components/shared/shared-ui";
import type { SharedDetail } from "@/lib/data/shared";
import { formatDayLabel } from "@/lib/finance/format";
import { balanceBySubcategory, computeBalance } from "@/lib/finance/shared";
import type { Person } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Props = SharedDetail & {
  contacts: Person[];
  today: string;
  link: SummaryLink;
  expenseCategories: { id: string; name: string }[];
};

/** Detalle de un espacio: balance, desglose por subcategoría e historial. */
export function SharedSpaceView({ space, entries, me, contacts, today, link, expenseCategories }: Props) {
  const members = activeMembers(space.members);
  const allUids = space.members.map((m) => m.uid);
  const balance = computeBalance(entries, allUids);
  const bySub = balanceBySubcategory(entries, allUids);
  const memberOf = new Map(space.members.map((m) => [m.uid, m]));
  const subName = new Map(space.subcategories.map((s) => [s.id, s.name]));
  const nameOf = (uid: string) => (uid === me ? "Tú" : memberOf.get(uid) ? firstName(memberOf.get(uid)!) : "—");
  const myNet = balance.people[me]?.net ?? 0;

  return (
    <main className="space-y-5">
      <Link
        href="/compartidos"
        className="-ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Compartidos
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <CategoryIcon icon={space.icon} color={space.color} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{space.name}</h1>
          <div className="mt-1 flex -space-x-2">
            {members.map((m) => (
              <PersonAvatar key={m.uid} person={m} className="size-7 border-2 border-background text-xs" />
            ))}
          </div>
        </div>
        <AddSettlementButton space={space} members={members} me={me} myNet={myNet} />
        <AddExpenseButton space={space} members={members} me={me} />
        <SpaceSettingsButton
          space={space}
          me={me}
          contacts={contacts}
          link={link}
          expenseCategories={expenseCategories}
        />
      </div>

      <BalanceBeam members={members} balance={balance} me={me} />

      {bySub.length > 0 && (
        <section aria-label="Por subcategoría" className="rounded-3xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold">Por subcategoría</h2>
          <ul className="mt-2 divide-y">
            {bySub.map((row) => {
              const name = (row.subcategoryId && subName.get(row.subcategoryId)) || "Sin subcategoría";
              return (
                <li key={row.subcategoryId ?? "none"} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">{name}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{money(row.total)}</p>
                  </div>
                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
                    {members.map((m, i) => (
                      <div
                        key={m.uid}
                        className={toneAt(i).dot}
                        style={{ width: `${((row.people[m.uid]?.paid ?? 0) / row.total) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
                    {members.map((m, i) => (
                      <span key={m.uid} className="inline-flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-full", toneAt(i).dot)} />
                        {money(row.people[m.uid]?.paid ?? 0)}
                        <span className="text-foreground/70">({signedMoney(row.people[m.uid]?.net ?? 0)})</span>
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
            Todavía no hay movimientos. Usa <strong className="font-medium text-foreground">Gasto</strong> para
            cargar el primero.
          </p>
        ) : (
          <CollapsibleList limit={10} noun="movimientos" className="mt-2 divide-y">
            {entries.map((e) => {
              const settlement = e.type === "settlement";
              const payer = memberOf.get(e.paidBy);
              const beneficiaries = Object.keys(e.split);
              const forOne = !settlement && beneficiaries.length === 1 && members.length > 1 ? beneficiaries[0] : null;
              const sub = e.subcategoryId ? subName.get(e.subcategoryId) : null;
              const title = settlement
                ? `${nameOf(e.paidBy)} → ${nameOf(beneficiaries[0])}`
                : e.note || sub || "Gasto";
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="relative">
                    {payer ? (
                      <PersonAvatar person={payer} className="size-9" />
                    ) : (
                      <span className="grid size-9 place-items-center rounded-full bg-muted">?</span>
                    )}
                    <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border-2 border-card bg-muted text-muted-foreground">
                      {settlement ? <ArrowLeftRight className="size-2.5" /> : <Receipt className="size-2.5" />}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        formatDayLabel(e.date, today),
                        settlement ? null : nameOf(e.paidBy),
                        !settlement && e.note ? sub : null,
                        forOne ? `Para ${nameOf(forOne)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{money(e.amountCents)}</span>
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
