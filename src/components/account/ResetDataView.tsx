import { TriangleAlert } from "lucide-react";
import { ResetDataForm } from "@/components/account/ResetDataForm";

const DELETED = [
  "Movimientos, categorías y presupuestos",
  "Tarjetas y compras en cuotas",
  "Metas de ahorro y sus aportes",
  "Contactos y solicitudes",
  "Tu salida de los gastos y objetivos compartidos (lo que cargaste queda para los demás)",
];

/** Módulo de pruebas: borra todo para volver a cargar la cuenta desde cero. */
export function ResetDataView() {
  return (
    <main className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Eliminar información</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deja tu cuenta como nueva para volver a cargar todo desde cero.
        </p>
      </div>

      <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-destructive">
          <TriangleAlert className="size-4" /> Esto no se puede deshacer
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {DELETED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Se conserva tu inicio de sesión con Google: al terminar puedes empezar de nuevo.
        </p>
      </section>

      <ResetDataForm />
    </main>
  );
}
