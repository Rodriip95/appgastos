import { BingoDog } from "@/components/brand/Bingo";
import { formatMoney } from "@/lib/finance/format";

/** Bienvenida de la home: Bingo con la billetera y un mensaje según cómo va el mes. */
export function BingoGreeting({ balance, hasMovements }: { balance: number; hasMovements: boolean }) {
  const message = !hasMovements
    ? "¡Guau! Empecemos el mes: registra tu primer movimiento con + o −."
    : balance >= 0
      ? `¡Vamos bien! Te quedan ${formatMoney(balance)} este mes.`
      : `Ojo: este mes gastaste ${formatMoney(Math.abs(balance))} más de lo que ingresó.`;

  return (
    <section
      aria-label="Bingo"
      className="flex items-center gap-3 overflow-hidden rounded-3xl bg-secondary py-2 pr-4 pl-1"
    >
      <BingoDog variant="wallet" title="Bingo con tu billetera" className="w-32 shrink-0 sm:w-36" />
      <p className="text-sm font-medium text-secondary-foreground">{message}</p>
    </section>
  );
}
