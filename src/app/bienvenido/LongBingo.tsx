import { BingoMark } from "@/components/brand/Bingo";
import s from "./welcome.module.css";

/**
 * Bingo de perfil, con el cuerpo que se estira según `--p` (lo publica el `Motion` que lo contiene).
 * Solo CSS: la cola menea siempre y las patas se mueven al ritmo del scroll.
 */
export function LongBingo() {
  return (
    <div className={s.longDog} aria-hidden="true">
      <svg className={s.tail} viewBox="0 0 90 70">
        <path d="M84 52 C60 50 34 40 12 12 C9 8 14 3 18 7 C38 30 60 38 86 38 Z" fill="#df8b50" stroke="#653324" strokeWidth="3.5" strokeLinejoin="round" />
      </svg>
      <span className={`${s.leg} ${s.legBack}`} />
      <span className={`${s.leg} ${s.legBack} ${s.legAlt}`} />
      <span className={s.body} />
      <span className={`${s.leg} ${s.legFront}`} />
      <span className={`${s.leg} ${s.legFront} ${s.legAlt}`} />
      <BingoMark className={s.head} />
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
