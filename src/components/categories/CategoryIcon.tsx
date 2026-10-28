import {
  Baby,
  Briefcase,
  Bus,
  Car,
  Coffee,
  CreditCard,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  type LucideIcon,
  PawPrint,
  PiggyBank,
  Plane,
  Popcorn,
  Receipt,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sofa,
  Store,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColorKey, IconKey } from "@/lib/finance/catalog";

export const CATEGORY_ICONS: Record<IconKey, LucideIcon> = {
  tag: Tag,
  house: House,
  sofa: Sofa,
  zap: Zap,
  wifi: Wifi,
  smartphone: Smartphone,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  coffee: Coffee,
  car: Car,
  fuel: Fuel,
  bus: Bus,
  plane: Plane,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  "graduation-cap": GraduationCap,
  popcorn: Popcorn,
  shirt: Shirt,
  baby: Baby,
  "paw-print": PawPrint,
  wrench: Wrench,
  "credit-card": CreditCard,
  receipt: Receipt,
  landmark: Landmark,
  gift: Gift,
  briefcase: Briefcase,
  laptop: Laptop,
  "trending-up": TrendingUp,
  store: Store,
  "piggy-bank": PiggyBank,
  wallet: Wallet,
};

// Clases literales para que Tailwind las detecte.
export const CATEGORY_COLORS: Record<ColorKey, { soft: string; solid: string }> = {
  slate: { soft: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300", solid: "bg-slate-500" },
  red: { soft: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300", solid: "bg-red-500" },
  orange: { soft: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300", solid: "bg-orange-500" },
  amber: { soft: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", solid: "bg-amber-500" },
  lime: { soft: "bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300", solid: "bg-lime-500" },
  emerald: { soft: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", solid: "bg-emerald-500" },
  teal: { soft: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300", solid: "bg-teal-500" },
  sky: { soft: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300", solid: "bg-sky-500" },
  blue: { soft: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", solid: "bg-blue-500" },
  indigo: { soft: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300", solid: "bg-indigo-500" },
  violet: { soft: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", solid: "bg-violet-500" },
  pink: { soft: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300", solid: "bg-pink-500" },
};

type Props = {
  icon?: IconKey;
  color?: ColorKey;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: "size-8 rounded-lg [&_svg]:size-4",
  md: "size-10 rounded-xl [&_svg]:size-5",
  lg: "size-12 rounded-2xl [&_svg]:size-6",
};

/** Ícono de categoría con su color. Sin categoría se muestra gris con una etiqueta. */
export function CategoryIcon({ icon = "tag", color = "slate", size = "md", className }: Props) {
  const Icon = CATEGORY_ICONS[icon] ?? Tag;
  const tone = CATEGORY_COLORS[color] ?? CATEGORY_COLORS.slate;
  return (
    <span className={cn("grid shrink-0 place-items-center", SIZES[size], tone.soft, className)}>
      <Icon aria-hidden />
    </span>
  );
}
