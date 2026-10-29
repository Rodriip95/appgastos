import { PersonAvatar } from "@/components/contacts/PersonAvatar";
import { money, signedMoney, toneAt, firstName } from "@/components/shared/shared-ui";
import type { Balance } from "@/lib/finance/shared";
import type { SharedMember } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const MAX_TILT = 14;

type Props = {
  /** Participantes activos, en orden fijo */
  members: SharedMember[];
  balance: Balance;
  me: string;
};

/**
 * Balance del espacio: una barra que se inclina hacia quien puso de más y, debajo,
 * lo que pagó y el saldo de cada uno. Solo números.
 */
export function BalanceBeam({ members, balance, me }: Props) {
  const pair = members.length === 2 ? members : null;
  const netLeft = pair ? (balance.people[pair[0].uid]?.net ?? 0) : 0;
  const ratio = balance.total ? Math.max(-1, Math.min(1, (netLeft / balance.total) * 2)) : 0;
  // Con rotate positivo cae el lado derecho; el izquierdo cae cuando puso de más.
  const tilt = -ratio * MAX_TILT;

  return (
    <section aria-label="Balance" className="rounded-3xl border bg-card p-5">
      <p className="text-xs text-muted-foreground">Total</p>
      <p className="mt-0.5 text-4xl font-semibold tracking-tight tabular-nums">{money(balance.total)}</p>

      {pair && (
        <div className="relative mx-auto mt-6 mb-2 h-20 max-w-sm" aria-hidden>
          <div
            className="absolute inset-x-0 top-5 flex items-center transition-transform duration-500 ease-out"
            style={{ transform: `rotate(${tilt}deg)` }}
          >
            <div className="relative h-2.5 w-full overflow-hidden rounded-full">
              <div className={cn("absolute inset-y-0 left-0 w-1/2", toneAt(0).dot)} />
              <div className={cn("absolute inset-y-0 right-0 w-1/2", toneAt(1).dot)} />
            </div>
            {pair.map((m, i) => (
              <div
                key={m.uid}
                className={cn("absolute -top-4 transition-transform duration-500", i === 0 ? "-left-1" : "-right-1")}
                style={{ transform: `rotate(${-tilt}deg)` }}
              >
                <PersonAvatar person={m} className="size-9 border-2 border-card" />
              </div>
            ))}
          </div>
          <div className="absolute top-[26px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[9px] border-b-[18px] border-x-transparent border-b-muted-foreground/40" />
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
