import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChartPie, Shapes, Wallet } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Iniciar sesión · Mis Gastos" };

const FEATURES = [
  { icon: Wallet, text: "Registra ingresos y gastos en segundos" },
  { icon: Shapes, text: "Tus propias categorías y subcategorías" },
  { icon: ChartPie, text: "Balance mensual y en qué se va tu plata" },
];

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col justify-center bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Wallet className="size-6" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Mis Gastos</h1>
        <p className="mt-2 text-muted-foreground">Tus finanzas del mes, claras y en un solo lugar.</p>

        <ul className="mt-8 space-y-3">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span className="grid size-8 place-items-center rounded-lg bg-background shadow-sm">
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="mt-10">
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
