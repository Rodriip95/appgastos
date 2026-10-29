import type { UpcomingDue } from "@/lib/finance/cards";
import { formatMoney, formatMonth, formatShortDate, shiftMonth } from "@/lib/finance/format";
import { goalPct, goalRemaining } from "@/lib/finance/goals";
import { changePct, type MonthSummary } from "@/lib/finance/summary";
import type { Category, Goal, Transaction } from "@/lib/finance/types";

// Lo que Bingo le dice al usuario en la home. Lógica pura: decide qué casos aplican,
// los ordena por prioridad y arma el texto (con variantes para que no suene siempre igual).

export type BingoTone = "good" | "info" | "warn" | "alert";

export type BingoMessage = {
  /** Estable mientras el caso sea el mismo: se usa para recordar qué se cerró */
  id: string;
  tone: BingoTone;
  text: string;
  /** Qué ilustración acompaña: la billetera para plata, el saludo para avisos */
  variant: "hello" | "wallet";
  href?: string;
  cta?: string;
  /** Se puede cerrar por esta sesión; el mensaje base del mes no */
  dismissible: boolean;
};

export type BingoContext = {
  today: string;
  /** Mes en curso (YYYY-MM) */
  month: string;
  summary: MonthSummary;
  prevSummary: MonthSummary;
  /** Hubo movimientos el mes anterior (si no, no hay con qué comparar) */
  hasPrev: boolean;
  projection: number | null;
  categories: Category[];
  transactions: Transaction[];
  dues: UpcomingDue[];
  /** Fijos del mes pasado que todavía no se registraron este mes */
  pendingRecurring: Transaction[];
  goals: Goal[];
};

type Candidate = BingoMessage & { priority: number };

/** Elige una variante de forma estable durante el día (igual en servidor y cliente). */
function pick(variants: string[], seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return variants[h % variants.length];
}

const money = formatMoney;

function dueMessage(dues: UpcomingDue[], today: string): Candidate {
  const first = dues[0];
  const urgent = first.daysLeft <= 2;
  const signature = dues.map((d) => `${d.card.id}:${d.date}`).join("|");
  const when = (d: UpcomingDue) =>
    d.daysLeft === 0 ? "hoy" : d.daysLeft === 1 ? "mañana" : `en ${d.daysLeft} días`;
  const amountOf = (d: UpcomingDue) => (d.amount > 0 ? ` (${money(d.amount)} en cuotas)` : "");
  const seed = `${today}:due`;

  let text: string;
  if (dues.length === 1) {
    const name = first.card.name;
    const date = formatShortDate(first.date);
    if (first.daysLeft === 0) {
      text = pick(
        [
          `¡Guau guau! Hoy vence ${name}${amountOf(first)}. Que no se te pase, ¡yo te lo recuerdo con ladridos!`,
          `Alerta de olfato: ${name} vence hoy${amountOf(first)}. Págala antes de que termine el día.`,
        ],
        seed,
      );
    } else if (first.daysLeft === 1) {
      text = pick(
        [
          `Ruff, ruff: ${name} vence mañana${amountOf(first)}. Deja la plata lista para no pagar recargos.`,
          `Mañana vence ${name}${amountOf(first)}. ¡Yo ya estoy moviendo la cola para que no se te olvide!`,
        ],
        seed,
      );
    } else {
      text = pick(
        [
          `Te aviso con tiempo: ${name} vence ${when(first)}, el ${date}${amountOf(first)}. ¡A organizarse!`,
          `Olfateé un vencimiento: ${name}, ${when(first)} (${date})${amountOf(first)}. Así llegas tranquilo.`,
        ],
        seed,
      );
    }
    if (first.amount === 0) text += " Revisa tu resumen para saber cuánto es.";
  } else {
    const list = dues.map((d) => `${d.card.name} ${when(d)}`).join(", ");
    const total = dues.reduce((sum, d) => sum + d.amount, 0);
    text = pick(
      [
        `¡Guau! Tienes ${dues.length} vencimientos cerca: ${list}.${total > 0 ? ` En cuotas ya hay ${money(total)} cargados.` : ""}`,
        `Ojo, ${dues.length} tarjetas por vencer: ${list}.${total > 0 ? ` Suman ${money(total)} en cuotas.` : ""} ¡Vamos de a una!`,
      ],
      seed,
    );
  }

  return {
    id: `due:${signature}`,
    priority: urgent ? 0 : 30,
    tone: urgent ? "alert" : "warn",
    variant: "hello",
    text,
    href: "/tarjetas",
    cta: "Ver tarjetas",
    dismissible: true,
  };
}

/** Todos los casos que aplican hoy, del más urgente al más tranquilo (máximo `limit`). */
export function bingoMessages(ctx: BingoContext, limit = 4): BingoMessage[] {
  const { summary, prevSummary, today, month } = ctx;
  const out: Candidate[] = [];
  const hasMovements = ctx.transactions.length > 0;
  const day = Number(today.slice(8, 10));
  const prevName = formatMonth(shiftMonth(month, -1)).split(" ")[0].toLowerCase();

  // --- Vencimientos de tarjetas ---
  if (ctx.dues.length > 0) out.push(dueMessage(ctx.dues, today));

  // --- Empezar: sin categorías ---
  if (ctx.categories.length === 0) {
    out.push({
      id: "no-categories",
      priority: 5,
      tone: "info",
      variant: "hello",
      text: pick(
        [
          "¡Guau! Para saber en qué se va tu plata necesito categorías. Puedes empezar con las sugeridas, es un toque.",
          "Todavía no tienes categorías y yo no sé dónde buscar. Armemos las tuyas (hay sugeridas para arrancar).",
        ],
        `${today}:cats`,
      ),
      href: "/categorias",
      cta: "Configurar categorías",
      dismissible: false,
    });
  }

  // --- Gastaste más de lo que ingresó ---
  if (summary.balance < 0) {
    const gap = money(Math.abs(summary.balance));
    out.push(
      summary.income === 0
        ? {
            id: `no-income:${month}`,
            priority: 12,
            tone: "info",
            variant: "wallet",
            text: pick(
              [
                `Veo ${money(summary.expense)} de gastos y ningún ingreso este mes, por eso todo está en rojo. ¿Anotamos tu sueldo?`,
                `¿Y los ingresos? Este mes solo hay gastos (${money(summary.expense)}). Carga lo que cobraste y mira cómo cambia.`,
              ],
              `${today}:noinc`,
            ),
            dismissible: true,
          }
        : {
            id: `overspent:${month}`,
            priority: 10,
            tone: "alert",
            variant: "wallet",
            text: pick(
              [
                `Ojo, ladro por tu bien: este mes gastaste ${gap} más de lo que ingresó. Frenemos un poco las compras.`,
                `Estamos en rojo por ${gap}. Mira el desglose y busca qué recortar hasta fin de mes, ¡yo te acompaño!`,
              ],
              `${today}:over`,
            ),
            dismissible: true,
          },
    );
  }

  // --- Presupuestos ---
  const budgeted = summary.breakdown.expense
    .filter((r) => r.category?.budget)
    .map((r) => ({ row: r, ratio: r.total / (r.category!.budget as number) }))
    .filter((b) => b.ratio >= 0.8)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 2);
  for (const { row, ratio } of budgeted) {
    const cat = row.category!;
    const left = (cat.budget as number) - row.total;
    const over = ratio >= 1;
    out.push({
      id: `budget:${cat.id}:${over ? "over" : "near"}:${month}`,
      priority: over ? 15 : 40,
      tone: over ? "alert" : "warn",
      variant: "wallet",
      text: over
        ? pick(
            [
              `Te pasaste del tope de ${cat.name}: llevas ${money(row.total)} de ${money(cat.budget as number)}. ¡Cuidado con esa tentación!`,
              `Rompimos el presupuesto de ${cat.name} (${money(row.total)} de ${money(cat.budget as number)}). Lo que sigue, a pan y agua.`,
            ],
            `${today}:${cat.id}`,
          )
        : pick(
            [
              `Casi llegas al tope de ${cat.name}: ${Math.round(ratio * 100)}% usado, te quedan ${money(left)}. Ojo con lo que falta del mes.`,
              `Husmeé tu presupuesto de ${cat.name}: ya va el ${Math.round(ratio * 100)}%. Quedan ${money(left)}, ¡a administrarlos!`,
            ],
            `${today}:${cat.id}`,
          ),
      dismissible: true,
    });
  }

  // --- Proyección de fin de mes ---
  if (ctx.projection && summary.income > 0 && ctx.projection > summary.income && summary.balance >= 0) {
    out.push({
      id: `projection:${month}`,
      priority: 35,
      tone: "warn",
      variant: "wallet",
      text: pick(
        [
          `A este ritmo cerrarías el mes gastando unos ${money(ctx.projection)}, más de lo que ingresó (${money(summary.income)}). Todavía estás a tiempo de frenar.`,
          `Hice la cuenta con la cola: si sigues así llegarías a ${money(ctx.projection)} de gastos y tus ingresos son ${money(summary.income)}. Ojo ahí.`,
        ],
        `${today}:proj`,
      ),
      dismissible: true,
    });
  }

  // --- Gasto mucho mayor al del mes pasado ---
  const growth = changePct(summary.expense, prevSummary.expense);
  if (ctx.hasPrev && growth !== null && growth >= 15 && day >= 5) {
    const top = summary.breakdown.expense[0]?.category?.name;
    out.push({
      id: `spike:${month}`,
      priority: 45,
      tone: "warn",
      variant: "wallet",
      text: pick(
        [
          `Ya gastaste ${growth}% más que en todo ${prevName} (${money(prevSummary.expense)}).${top ? ` Lo que más pesa: ${top}.` : ""}`,
          `Algo huele distinto: este mes vas ${growth}% arriba de ${prevName}.${top ? ` Empieza mirando ${top}.` : ""}`,
        ],
        `${today}:spike`,
      ),
      dismissible: true,
    });
  }

  // --- Fijos pendientes ---
  if (ctx.pendingRecurring.length > 0) {
    const n = ctx.pendingRecurring.length;
    const example = ctx.pendingRecurring[0].note || "un gasto fijo";
    out.push({
      id: `recurring:${month}:${n}`,
      priority: 50,
      tone: "info",
      variant: "hello",
      text:
        n === 1
          ? pick(
              [
                `Falta registrar un fijo del mes pasado: ${example}. Anótalo así no se te escapa.`,
                `Un fijo sin anotar: ${example}. ¡Es de los que se repiten, no lo dejes para después!`,
              ],
              `${today}:rec`,
            )
          : pick(
              [
                `Faltan ${n} fijos del mes pasado por registrar (como ${example}). Los sugeridos están abajo, ¡un toque y listo!`,
                `Tengo ${n} gastos fijos en la mira que todavía no anotaste, por ejemplo ${example}. Regístralos y quedas al día.`,
              ],
              `${today}:rec`,
            ),
      dismissible: true,
    });
  }

  // --- Metas cerca ---
  const almost = ctx.goals
    .filter((g) => goalPct(g) >= 90 && goalRemaining(g) > 0)
    .sort((a, b) => goalPct(b) - goalPct(a))[0];
  if (almost) {
    out.push({
      id: `goal-near:${almost.id}`,
      priority: 55,
      tone: "good",
      variant: "wallet",
      text: pick(
        [
          `¡Estás a un pasito de “${almost.name}”! Te faltan solo ${money(goalRemaining(almost))}. ¡Guau, qué orgullo!`,
          `Casi, casi: “${almost.name}” está al ${Math.floor(goalPct(almost))}%. Con ${money(goalRemaining(almost))} más la cumples.`,
        ],
        `${today}:goal`,
      ),
      href: "/ahorros",
      cta: "Ver metas",
      dismissible: true,
    });
  }

  // --- Hoy no anotó nada ---
  if (hasMovements && day >= 2 && !ctx.transactions.some((t) => t.date === today)) {
    out.push({
      id: `no-today:${today}`,
      priority: 70,
      tone: "info",
      variant: "hello",
      text: pick(
        [
          "Hoy no anotaste nada. ¿Gastaste algo? Regístralo ahora, mientras te acuerdas.",
          "Ni un movimiento hoy… ¿seguro que no compraste nada? Yo no vi nada, ¡cuéntame!",
        ],
        `${today}:today`,
      ),
      dismissible: true,
    });
  }

  // --- Te sobra plata ---
  const spare = summary.balance;
  if (summary.income > 0 && spare > 0 && spare / summary.income >= 0.2) {
    const target = ctx.goals.find((g) => goalRemaining(g) > 0);
    out.push({
      id: `spare:${month}`,
      priority: 60,
      tone: "good",
      variant: "wallet",
      text: target
        ? pick(
            [
              `Te sobran ${money(spare)} este mes. ¿Qué tal apartar una parte para “${target.name}”?`,
              `¡Buen mes! Tienes ${money(spare)} libres. “${target.name}” se pondría muy contenta con un aporte.`,
            ],
            `${today}:spare`,
          )
        : pick(
            [
              `Te sobran ${money(spare)} este mes. ¿Y si los guardas en una meta de ahorro? Yo ya elegí hueso para enterrar.`,
              `¡Guau, qué mes! Tienes ${money(spare)} libres. Es un buen momento para empezar una meta.`,
            ],
            `${today}:spare`,
          ),
      href: "/ahorros",
      cta: target ? "Ir a mis metas" : "Crear una meta",
      dismissible: true,
    });
  }

  // --- Mensaje base (siempre hay uno) ---
  out.push({
    id: `base:${month}`,
    priority: 100,
    tone: summary.balance < 0 ? "warn" : "good",
    variant: "wallet",
    dismissible: false,
    text: !hasMovements
      ? pick(
          [
            "¡Guau! Empecemos el mes: registra tu primer movimiento con + o −.",
            "Mes nuevo, billetera limpia. Anota tu primer ingreso o gasto con + o − y yo me encargo del resto.",
          ],
          `${today}:empty`,
        )
      : summary.balance >= 0
        ? pick(
            [
              `¡Vamos bien! Te quedan ${money(summary.balance)} este mes.`,
              `Todo en orden por acá: ${money(summary.balance)} disponibles este mes. ¡Sigue así!`,
            ],
            `${today}:ok`,
          )
        : `Este mes vas ${money(Math.abs(summary.balance))} abajo. Cada gasto que anotas me ayuda a mostrarte dónde se va.`,
  });

  // El mensaje base queda siempre: es lo que se ve cuando se cierran los demás.
  const base = out.filter((m) => !m.dismissible);
  const extras = out.filter((m) => m.dismissible).sort((a, b) => a.priority - b.priority);
  return [...base, ...extras]
    .sort((a, b) => a.priority - b.priority)
    .filter((m, i, all) => m.dismissible ? all.slice(0, i).filter((x) => x.dismissible).length < limit - 1 : true)
    .map((m) => ({
      id: m.id,
      tone: m.tone,
      text: m.text,
      variant: m.variant,
      href: m.href,
      cta: m.cta,
      dismissible: m.dismissible,
    }));
}
