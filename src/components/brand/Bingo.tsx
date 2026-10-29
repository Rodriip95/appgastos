import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Bingo: el salchicha rojo que da nombre y cara a la app.
// Ilustración plana en SVG (sin dependencias) para que escale y respete el tema.

const C = {
  body: "#b4462a",
  bodyLight: "#c4552f",
  dark: "#8c301b",
  belly: "#d9714a",
  paw: "#d46a45",
  nose: "#2b1610",
  blush: "#e8826a",
  collar: "#f28c28",
  tag: "#ffc56b",
  wallet: "#f28c28",
  walletDark: "#c96a12",
};

/** Cabeza de Bingo (oreja, cabeza, hocico, ojo y nariz). Coordenadas compartidas. */
function Head({ smile = true }: { smile?: boolean }) {
  return (
    <>
      <circle cx="204" cy="44" r="27" fill={C.body} />
      <ellipse cx="232" cy="56" rx="22" ry="14" fill={C.bodyLight} />
      <ellipse cx="252" cy="50" rx="7" ry="6" fill={C.nose} />
      <circle cx="250" cy="48" r="1.6" fill="#fff" opacity="0.7" />
      <circle cx="213" cy="36" r="4.2" fill={C.nose} />
      <circle cx="214.6" cy="34.4" r="1.4" fill="#fff" />
      <ellipse cx="223" cy="50" rx="5" ry="3" fill={C.blush} opacity="0.7" />
      {smile && (
        <path d="M228 64 Q237 71 246 63" stroke={C.nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      )}
      {/* Oreja larga y caída, el sello del salchicha */}
      <path
        d="M193 24 C178 22 169 36 171 54 C173 71 182 81 193 79 C201 77 203 62 201 46 C200 35 199 26 193 24 Z"
        fill={C.dark}
      />
    </>
  );
}

type DogProps = {
  /** "hello": saludando con la cola (login). "wallet": con la billetera en la boca (home). */
  variant?: "hello" | "wallet";
  className?: string;
  title?: string;
};

/** Bingo de cuerpo entero, de perfil. */
export function BingoDog({ variant = "hello", className, title = "Bingo, el perro salchicha" }: DogProps) {
  const wallet = variant === "wallet";
  return (
    <svg viewBox="0 0 280 160" role="img" aria-label={title} className={className}>
      <ellipse cx="135" cy="148" rx="95" ry="7" fill="#2b1610" opacity="0.1" />

      {/* Cola (y movimiento al saludar) */}
      <path d="M52 80 C34 74 23 60 21 41" stroke={C.body} strokeWidth="10" fill="none" strokeLinecap="round" />
      {!wallet && (
        <g stroke={C.collar} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M8 34 Q3 41 7 49" />
          <path d="M18 22 Q25 17 33 20" />
        </g>
      )}

      {/* Patas de atrás (lejanas) */}
      <rect x="64" y="100" width="14" height="36" rx="7" fill={C.dark} />
      <rect x="166" y="100" width="14" height="36" rx="7" fill={C.dark} />

      {/* Cuerpo largo */}
      <rect x="44" y="62" width="152" height="56" rx="28" fill={C.body} />
      <ellipse cx="122" cy="111" rx="62" ry="7" fill={C.belly} opacity="0.55" />

      {/* Patas cercanas */}
      <rect x="82" y="104" width="15" height="34" rx="7.5" fill={C.body} />
      <rect x="180" y="104" width="15" height="34" rx="7.5" fill={C.body} />
      <ellipse cx="92" cy="138" rx="10" ry="5" fill={C.paw} />
      <ellipse cx="190" cy="138" rx="10" ry="5" fill={C.paw} />

      {/* Cuello y collar naranja */}
      <path d="M166 72 C174 54 186 44 199 42 L214 70 C205 85 187 93 171 93 Z" fill={C.body} />
      <rect x="177" y="56" width="12" height="36" rx="6" transform="rotate(-30 183 74)" fill={C.collar} />
      <circle cx="176" cy="92" r="5.5" fill={C.tag} />

      <Head smile={!wallet} />

      {/* Billetera en la boca */}
      {wallet && (
        <g>
          <circle cx="244" cy="60" r="7" fill={C.tag} stroke={C.walletDark} strokeWidth="1.5" />
          <rect x="226" y="62" width="44" height="30" rx="6" fill={C.wallet} />
          <rect x="226" y="62" width="44" height="12" rx="6" fill={C.walletDark} />
          <rect x="250" y="70" width="20" height="12" rx="4" fill={C.walletDark} />
          <circle cx="262" cy="76" r="3" fill={C.tag} />
        </g>
      )}
    </svg>
  );
}

/** Solo la cabeza: logo del header e ícono. */
export function BingoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="164 12 100 76" role="img" aria-label="Bingo" className={className}>
      <path d="M166 72 C174 54 186 44 199 42 L214 70 C205 85 187 93 171 93 Z" fill={C.body} />
      <Head />
    </svg>
  );
}

// Inclinación de cada letra: rebote juguetón, al estilo de los títulos infantiles.
const TILT = [-7, 4, -3, 6, -4];

/** Logotipo "Bingo": letras redondeadas, naranjas con borde marrón y un leve rebote. */
export function BingoWordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const outline = size === "sm" ? 1.5 : size === "md" ? 2.5 : 3.5;
  const stroke = "var(--wordmark-outline, #7a2c18)";
  const shadows = [
    [outline, 0],
    [-outline, 0],
    [0, outline],
    [0, -outline],
    [outline, outline],
    [-outline, outline],
    [outline, -outline],
    [-outline, -outline],
  ]
    .map(([x, y]) => `${x}px ${y}px 0 ${stroke}`)
    .concat(`0 ${outline + 2}px 0 ${stroke}`)
    .join(", ");

  return (
    <span
      aria-label="Bingo"
      role="img"
      className={cn(
        "inline-flex font-brand font-bold tracking-wide select-none",
        size === "sm" && "text-2xl",
        size === "md" && "text-4xl",
        size === "lg" && "text-6xl",
        className,
      )}
      style={{ color: "var(--brand-orange)", textShadow: shadows } as CSSProperties}
    >
      {"Bingo".split("").map((letter, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block"
          style={{ transform: `rotate(${TILT[i]}deg) translateY(${i % 2 ? -2 : 1}px)` }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
