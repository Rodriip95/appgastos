/* eslint-disable @next/next/no-img-element -- el mismo SVG recortado en dos piezas; next/image no suma nada acá */
import s from "./welcome.module.css";

/** Ilustraciones de Bingo de la landing (en public/, dibujadas a mano). */
export const ART = {
  sitting: { src: "/caraDeCostado.svg", width: 188, height: 260 },
  alert: { src: "/bingoCuerpo.svg", width: 211, height: 259 },
  peek: { src: "/caraBingo.svg", width: 215, height: 137 },
  profile: { src: "/bingoPerfil.svg", width: 345, height: 250 },
};

/**
 * Bingo de perfil (bingoPerfil.svg, espejado para que mire a la derecha) con el cuerpo que se
 * estira según `--p` (lo publica el `Motion` que lo contiene). El dibujo se corta en x = 200,
 * donde el lomo y la panza son rectos: la cadera y el pecho son el mismo SVG recortado, y el tramo
 * del medio repite ese corte en CSS. Con `--p` en 0 se ve el dibujo tal cual.
 */
export function LongBingo() {
  return (
    <div className={s.longDog} aria-hidden="true">
      <div className={s.rear}><img src={ART.profile.src} alt="" className={s.walkArt} /></div>
      <span className={s.middle} />
      <div className={s.front}><img src={ART.profile.src} alt="" className={s.walkArt} /></div>
    </div>
  );
}

export function BoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 20" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="7" cy="6" r="5" /><circle cx="7" cy="14" r="5" />
      <circle cx="41" cy="6" r="5" /><circle cx="41" cy="14" r="5" />
      <rect x="7" y="5" width="34" height="10" rx="3" />
    </svg>
  );
}
