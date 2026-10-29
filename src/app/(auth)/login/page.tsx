import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChartPie, PiggyBank, Wallet } from "lucide-react";
import { BingoDog, BingoWordmark } from "@/components/brand/Bingo";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Iniciar sesión · Bingo" };

const FEATURES = [
  { icon: Wallet, text: "Registra ingresos y gastos en segundos" },
  { icon: ChartPie, text: "Mira en qué se va tu plata cada mes" },
  { icon: PiggyBank, text: "Ahorra para tus metas, de a poquito" },
];

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col justify-center overflow-hidden bg-background px-4 py-10">
      {/* Fondo cálido: dos manchas suaves naranja y marrón */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand-orange/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="rounded-[2rem] bg-secondary px-4 pt-6 pb-2">
          <BingoDog variant="hello" className="mx-auto w-full max-w-xs" />
        </div>

        <div className="mt-6 text-center">
          <BingoWordmark size="lg" />
          <p className="mt-3 text-muted-foreground">Tu compañero para cuidar la billetera.</p>
        </div>

        <ul className="mt-7 space-y-3">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <GoogleSignInButton />
        </div>
      </div>
      <Suspense>
        <RedirectIfAuthenticated />
      </Suspense>
    </main>
  );
}

// Si ya hay una sesión válida, no tiene sentido mostrar el login.
async function RedirectIfAuthenticated() {
  if (await getSessionUser()) redirect("/");
  return null;
}
