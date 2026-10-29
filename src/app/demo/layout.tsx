import Link from "next/link";
import { FlaskConical, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { DemoNav } from "@/components/layout/DemoNav";

/** Marco de la demo: sin login, con navegación propia entre secciones. */
export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Wallet className="size-4" />
            </span>
            Mis Gastos
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            <FlaskConical className="size-3.5" /> Demo
          </span>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 md:pt-8">
        <p className="mb-4 rounded-2xl border border-dashed p-3 text-center text-xs text-muted-foreground">
          Datos de ejemplo: puedes navegar y abrir formularios, pero nada se guarda.{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Entrar con tu cuenta
          </Link>
        </p>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <DemoNav />
          <ThemeToggle className="sm:w-72" />
        </div>
        {children}
      </div>
    </>
  );
}
