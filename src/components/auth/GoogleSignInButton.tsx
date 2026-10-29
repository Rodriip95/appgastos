"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { createSession } from "@/lib/auth/actions";

export function GoogleSignInButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      // El popup debe abrirse sin ningún `await` antes: los navegadores móviles
      // lo bloquean si se pierde el vínculo con el toque del usuario.
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      const { ok } = await createSession(await user.getIdToken());
      // La sesión vive en la cookie del servidor, no en el SDK cliente.
      await signOut(auth);
      if (!ok) throw new Error("session");
      router.replace("/");
      router.refresh();
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(
        code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
          ? null
          : code === "auth/popup-blocked"
            ? "Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio e inténtalo de nuevo."
            : "No pudimos iniciar sesión. Inténtalo de nuevo.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        aria-busy={loading}
        className="flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background px-4 text-sm font-semibold shadow-sm transition hover:border-primary/40 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
          <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {loading ? "Ingresando…" : "Continuar con Google"}
      </button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
