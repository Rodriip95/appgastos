import { PersonAvatar } from "@/components/contacts/PersonAvatar";
import { money, signedMoney, toneAt, firstName } from "@/components/shared/shared-ui";
import type { Balance } from "@/lib/finance/shared";
import type { SharedMember } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Props = {
  /** Participantes activos, en orden fijo */
  members: SharedMember[];
  balance: Balance;
  me: string;
};

/**
 * Balance del espacio: una línea entre las dos personas con un indicador que se
 * corre hacia quien pagó menos (al centro cuando están parejos) y, debajo, lo que
 * pagó y el saldo de cada uno. Solo números.
 */
export function BalanceLine({ members, balance, me }: Props) {
  const pair = members.length === 2 ? members : null;
  const netLeft = pair ? (balance.people[pair[0].uid]?.net ?? 0) : 0;
  // −1…1: positivo = la persona de la izquierda puso de más, el indicador va a la derecha.
  const ratio = balance.total ? Math.max(-1, Math.min(1, (netLeft / balance.total) * 2)) : 0;
  const position = 50 + ratio * 50;

  return (
    <section aria-label="Balance" className="rounded-3xl border bg-card p-5">
      <p className="text-xs text-muted-foreground">Total</p>
      <p className="mt-0.5 text-4xl font-semibold tracking-tight tabular-nums">{money(balance.total)}</p>

      {pair && (
        <div className="mt-5 flex items-center gap-3" aria-hidden>
          <PersonAvatar person={pair[0]} className="size-9" />
          <div className="relative h-9 flex-1">
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full">
              <div className={cn("absolute inset-y-0 left-0 w-1/2", toneAt(0).dot)} />
              <div className={cn("absolute inset-y-0 right-0 w-1/2", toneAt(1).dot)} />
            </div>
            <div className="absolute top-1/2 left-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/80" />
            <div
              className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-foreground bg-background shadow-md transition-[left] duration-500 ease-out"
              style={{ left: `${position}%` }}
            />
          </div>
          <PersonAvatar person={pair[1]} className="size-9" />
        </div>
      )}

      <ul className="mt-4 divide-y">
        <li className="flex items-center gap-3 pb-2 text-xs text-muted-foreground">
          <span className="flex-1" />
          <span className="w-24 text-right">Pagó</span>
          <span className="w-24 text-right">Saldo</span>
        </li>
        {members.map((m, i) => {
          const p = balance.people[m.uid] ?? { paid: 0, share: 0, net: 0 };
          return (
            <li key={m.uid} className="flex items-center gap-3 py-2.5">
              <span className={cn("size-2.5 shrink-0 rounded-full", toneAt(i).dot)} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {m.uid === me ? "Tú" : firstName(m)}
              </span>
              <span className="w-24 text-right text-sm tabular-nums">{money(p.paid)}</span>
              <span className="w-24 text-right text-sm font-semibold tabular-nums">{signedMoney(p.net)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
