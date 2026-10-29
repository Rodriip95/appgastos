import { installmentSchedule } from "@/lib/finance/cards";
import { DEFAULT_CATEGORIES } from "@/lib/finance/defaults";
import { shiftMonth } from "@/lib/finance/format";
import type { Category, CreditCard, Transaction } from "@/lib/finance/types";

// Datos ficticios para /demo: permiten ver la UX completa sin login ni Firestore.
// Son deterministas (sin Math.random) para que servidor y cliente coincidan.

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

const BUDGETS: Record<string, number> = {
  Mercado: 420_000,
  "Comida afuera": 120_000,
  Entretenimiento: 90_000,
  Transporte: 80_000,
  Carro: 250_000,
};

export const DEMO_CATEGORIES: Category[] = DEFAULT_CATEGORIES.map((c) => ({
  ...c,
  id: slug(`${c.type}-${c.name}`),
  budget: c.type === "expense" ? (BUDGETS[c.name] ?? null) : null,
  subcategories: c.subcategories.map((name) => ({ id: slug(`${c.name}-${name}`), name })),
}));

export const DEMO_CARDS: CreditCard[] = [
  { id: "visa", name: "Visa Galicia", closingDay: 24, dueDay: 5, color: "blue" },
  { id: "master", name: "Mastercard BBVA", closingDay: 28, dueDay: 10, color: "violet" },
];

const cat = (name: string, type: "expense" | "income" = "expense") => {
  const c = DEMO_CATEGORIES.find((c) => c.name === name && c.type === type);
  if (!c) throw new Error(`Categoría demo inexistente: ${name}`);
  return c;
};

type Seed = {
  day: number;
  amount: number;
  category: string;
  sub?: string;
  note?: string;
  type?: "expense" | "income";
  recurring?: boolean;
};

// Un mes "típico". `day` se recorta al día de hoy en el mes en curso.
const MONTH_SEEDS: Seed[] = [
  { day: 1, amount: 1_850_000, category: "Sueldo", sub: "Sueldo", type: "income", note: "Sueldo", recurring: true },
  { day: 2, amount: 520_000, category: "Hogar", sub: "Alquiler", note: "Alquiler", recurring: true },
  { day: 3, amount: 85_000, category: "Hogar", sub: "Expensas", note: "Expensas", recurring: true },
  { day: 4, amount: 38_500, category: "Servicios", sub: "Internet", note: "Fibra 300MB", recurring: true },
  { day: 5, amount: 96_300, category: "Mercado", sub: "Supermercado", note: "Compra grande" },
  { day: 6, amount: 21_900, category: "Servicios", sub: "Celular", note: "Plan celular", recurring: true },
  { day: 7, amount: 14_800, category: "Comida afuera", sub: "Café", note: "Café con Sofi" },
  { day: 8, amount: 32_000, category: "Carro", sub: "Combustible", note: "Nafta" },
  { day: 9, amount: 9_400, category: "Mercado", sub: "Verdulería" },
  { day: 10, amount: 68_000, category: "Carro", sub: "Seguro", note: "Seguro auto", recurring: true },
  { day: 11, amount: 27_600, category: "Comida afuera", sub: "Delivery", note: "Pizza viernes" },
  { day: 12, amount: 18_990, category: "Entretenimiento", sub: "Streaming", note: "Netflix + Spotify", recurring: true },
  { day: 13, amount: 320_000, category: "Freelance", type: "income", note: "Landing para cliente" },
  { day: 14, amount: 112_400, category: "Mercado", sub: "Supermercado", note: "Compra semanal" },
  { day: 15, amount: 45_000, category: "Salud", sub: "Farmacia" },
  { day: 16, amount: 41_200, category: "Servicios", sub: "Luz", note: "Edenor", recurring: true },
  { day: 17, amount: 12_500, category: "Transporte", sub: "Taxi / Uber", note: "Uber al centro" },
  { day: 18, amount: 58_000, category: "Entretenimiento", sub: "Salidas", note: "Recital" },
  { day: 19, amount: 23_700, category: "Mercado", sub: "Carnicería" },
  { day: 20, amount: 35_000, category: "Carro", sub: "Combustible", note: "Nafta" },
  { day: 21, amount: 19_800, category: "Servicios", sub: "Gas", note: "Metrogas", recurring: true },
  { day: 22, amount: 88_700, category: "Mercado", sub: "Supermercado", note: "Compra semanal" },
  { day: 23, amount: 31_500, category: "Comida afuera", sub: "Restaurantes", note: "Cumple de Juan" },
  { day: 24, amount: 6_200, category: "Mascotas", sub: "Alimento" },
  { day: 25, amount: 15_000, category: "Inversiones", sub: "Plazo fijo", type: "income", note: "Intereses plazo fijo" },
  { day: 26, amount: 42_300, category: "Mercado", sub: "Supermercado" },
  { day: 27, amount: 9_900, category: "Transporte", sub: "Colectivo / Subte", note: "Carga SUBE" },
];

let counter = 0;

function fromSeed(seed: Seed, month: string, factor: number): Transaction {
  const c = cat(seed.category, seed.type ?? "expense");
  const day = String(seed.day).padStart(2, "0");
  return {
    id: `demo-${++counter}`,
    type: seed.type ?? "expense",
    // El mes anterior varía un poco para que la comparación tenga sentido.
    amount: Math.round(seed.amount * factor),
    date: `${month}-${day}`,
    month,
    categoryId: c.id,
    subcategoryId: seed.sub ? (c.subcategories.find((s) => s.name === seed.sub)?.id ?? null) : null,
    note: seed.note ?? "",
    recurring: seed.recurring ?? false,
    cardId: null,
    purchaseId: null,
    installment: null,
    createdAt: seed.day,
  };
}

/** Cuotas de compras con tarjeta, repartidas en los meses que corresponda. */
function cardInstallments(currentMonth: string): Transaction[] {
  const purchases = [
    { card: DEMO_CARDS[0], date: `${shiftMonth(currentMonth, -2)}-15`, amount: 480_000, n: 6, note: "Heladera", category: "Hogar", sub: "Muebles y deco" },
    { card: DEMO_CARDS[1], date: `${shiftMonth(currentMonth, -1)}-20`, amount: 210_000, n: 3, note: "Zapatillas", category: "Ropa y cuidado", sub: "Calzado" },
    { card: DEMO_CARDS[0], date: `${currentMonth}-03`, amount: 54_000, n: 1, note: "Libros", category: "Educación", sub: "Libros y útiles" },
  ];
  return purchases.flatMap((p, i) => {
    const c = cat(p.category);
    const subId = c.subcategories.find((s) => s.name === p.sub)?.id ?? null;
    return installmentSchedule(p.card, p.date, p.amount, p.n).map((ins) => ({
      id: `demo-card-${i}-${ins.n}`,
      type: "expense" as const,
      amount: ins.amount,
      date: ins.date,
      month: ins.month,
      categoryId: c.id,
      subcategoryId: subId,
      note: p.note,
      recurring: false,
      cardId: p.card.id,
      purchaseId: `demo-purchase-${i}`,
      installment: { n: ins.n, total: ins.total },
      createdAt: 0,
    }));
  });
}

export type DemoData = {
  categories: Category[];
  cards: CreditCard[];
  transactions: Transaction[];
  prevTransactions: Transaction[];
  upcomingCardTransactions: Transaction[];
  firstMonth: string;
};

/** Datos de un mes de ejemplo; `today` (YYYY-MM-DD) recorta el mes en curso. */
export function buildDemoData(month: string, today: string): DemoData {
  counter = 0;
  const currentMonth = today.slice(0, 7);
  const firstMonth = shiftMonth(currentMonth, -5);
  const prevMonth = shiftMonth(month, -1);
  const todayDay = Number(today.slice(8, 10));

  const monthSeeds = (m: string) =>
    m === currentMonth ? MONTH_SEEDS.filter((s) => s.day <= todayDay) : MONTH_SEEDS;
  // Factor estable por mes (0.85–1.15) a partir del número de mes.
  const factorFor = (m: string) => 0.85 + ((Number(m.slice(5, 7)) * 7) % 31) / 100;

  const installments = cardInstallments(currentMonth);
  const withCards = (m: string, txs: Transaction[]) =>
    [...txs, ...installments.filter((t) => t.month === m)].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
    );

  const transactions =
    month < firstMonth ? [] : withCards(month, monthSeeds(month).map((s) => fromSeed(s, month, factorFor(month))));
  // En el mes en curso, algunos fijos del mes anterior todavía no se cargaron (para mostrar "Pendientes").
  const current = month === currentMonth ? transactions.filter((t) => !(t.recurring && t.note === "Edenor")) : transactions;
  const prevTransactions =
    prevMonth < firstMonth
      ? []
      : withCards(prevMonth, MONTH_SEEDS.map((s) => fromSeed(s, prevMonth, factorFor(prevMonth))));

  return {
    categories: DEMO_CATEGORIES,
    cards: DEMO_CARDS,
    transactions: current,
    prevTransactions,
    upcomingCardTransactions: installments.filter((t) => t.month >= currentMonth),
    firstMonth,
  };
}
