// Catálogo de íconos y colores que el usuario puede asignar a sus categorías.
// Se guardan como claves en Firestore; el mapeo a componentes/clases vive en
// components/categories/CategoryIcon.tsx.

export const ICON_KEYS = [
  "tag",
  "house",
  "sofa",
  "zap",
  "wifi",
  "smartphone",
  "shopping-cart",
  "utensils",
  "coffee",
  "car",
  "fuel",
  "bus",
  "plane",
  "heart-pulse",
  "dumbbell",
  "graduation-cap",
  "popcorn",
  "shirt",
  "baby",
  "paw-print",
  "wrench",
  "credit-card",
  "receipt",
  "landmark",
  "gift",
  "briefcase",
  "laptop",
  "trending-up",
  "store",
  "piggy-bank",
  "wallet",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export const COLOR_KEYS = [
  "slate",
  "red",
  "orange",
  "amber",
  "lime",
  "emerald",
  "teal",
  "sky",
  "blue",
  "indigo",
  "violet",
  "pink",
] as const;

export type ColorKey = (typeof COLOR_KEYS)[number];
