import { useEffect, useRef } from "react";

/**
 * Campo de monto dentro de un panel (bottom sheet en mobile, diálogo en desktop).
 * En el celular el teclado no se abre solo: si aparece mientras el panel todavía
 * se anima, lo levanta y el campo se pierde. Se abre al tocar el monto y, cuando
 * ya está abierto, el campo se centra para que siga a la vista. En desktop se
 * enfoca al abrir.
 */
export function useAmountInput(autoFocusOnDesktop = true) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusOnDesktop && window.matchMedia("(min-width: 768px)").matches) ref.current?.focus();
  }, [autoFocusOnDesktop]);

  return {
    ref,
    /** Para el `onFocus` del input */
    onFocus: () => {
      // Espera a que el teclado termine de abrirse antes de centrar el campo.
      setTimeout(() => ref.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 350);
    },
    /** Para el `onClick` del contenedor: toda la fila del monto enfoca el campo */
    focus: () => ref.current?.focus(),
  };
}
