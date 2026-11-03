"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type Track = "view" | "stage" | "page";

/**
 * Publica el avance del scroll como variables CSS, sin re-renderizar React:
 * - `--p` (0 a 1): "view" = desde que el elemento asoma abajo hasta que sale arriba;
 *   "stage" = recorrido de una sección alta con un hijo sticky; "page" = toda la página.
 * - `data-step` cuando hay `steps` (para mostrar un paso a la vez desde CSS).
 * - `data-in`: "false" hasta que se ve por primera vez, después "true" (entradas escalonadas;
 *   sin JS no existe y el CSS muestra todo).
 * - `--mx`/`--my` (−1 a 1) con el puntero, si `pointer` (solo mouse).
 * El scroll del documento queda nativo; con movimiento reducido el CSS anula los desplazamientos.
 */
export function Motion({ children, className, style, track = "view", steps, pointer, id, as: Tag = "div" }: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  track?: Track;
  steps?: number;
  pointer?: boolean;
  id?: string;
  as?: "div" | "section";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      let p: number;
      if (track === "page") {
        const max = document.documentElement.scrollHeight - vh;
        p = max > 0 ? window.scrollY / max : 0;
      } else {
        const rect = node.getBoundingClientRect();
        p = track === "stage" ? -rect.top / Math.max(1, rect.height - vh) : (vh - rect.top) / (vh + rect.height);
        if (node.dataset.in !== "true") node.dataset.in = String(rect.top < vh * 0.8 && rect.bottom > 0);
      }
      p = Math.min(1, Math.max(0, p));
      node.style.setProperty("--p", p.toFixed(4));
      if (steps) node.dataset.step = String(Math.min(steps - 1, Math.floor(p * steps)));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

    const fine = window.matchMedia("(pointer: fine)");
    const onPointer = (e: PointerEvent) => {
      node.style.setProperty("--mx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      node.style.setProperty("--my", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    if (pointer && fine.matches) window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [track, steps, pointer]);

  return <Tag ref={ref as never} id={id} className={className} style={style}>{children}</Tag>;
}
