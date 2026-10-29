import { Clock, Users } from "lucide-react";
import { PersonAvatar } from "@/components/contacts/PersonAvatar";
import {
  AddContactButton,
  CancelRequestButton,
  RemoveContactButton,
  RequestActions,
} from "@/components/contacts/ContactSheets";
import { Badge } from "@/components/ui/badge";
import type { ContactsOverview } from "@/lib/data/contacts";
import type { Person } from "@/lib/finance/types";

function PersonInfo({ person }: { person: Person }) {
  return (
    <>
      <PersonAvatar person={person} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{person.name || person.email}</p>
        <p className="truncate text-xs text-muted-foreground">{person.email}</p>
      </div>
    </>
  );
}

/** Página de contactos. Solo presentación: los datos llegan de `(app)/contactos/page.tsx`. */
export function ContactsView({ contacts, incoming, outgoing }: ContactsOverview) {
  const empty = contacts.length === 0 && incoming.length === 0 && outgoing.length === 0;

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contactos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Las personas con las que compartes gastos y objetivos.
          </p>
        </div>
        {!empty && <AddContactButton />}
      </div>

      {empty && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-muted">
            <Users className="size-7 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Agrega tu primer contacto</h2>
          <p className="mt-1 mb-6 max-w-sm text-sm text-muted-foreground">
            Búscalo por su email. Cuando acepte tu solicitud podrán compartir gastos y objetivos.
          </p>
          <AddContactButton className="h-11" />
        </div>
      )}

      {incoming.length > 0 && (
        <section aria-label="Solicitudes recibidas" className="rounded-3xl border bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            Solicitudes <Badge>{incoming.length}</Badge>
          </h2>
          <ul className="mt-2 divide-y">
            {incoming.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <PersonInfo person={r.from} />
                <RequestActions id={r.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {contacts.length > 0 && (
        <section aria-label="Mis contactos" className="rounded-3xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold">Mis contactos</h2>
          <ul className="mt-2 divide-y">
            {contacts.map((c) => (
              <li key={c.uid} className="flex items-center gap-3 py-2.5">
                <PersonInfo person={c} />
                <RemoveContactButton uid={c.uid} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section aria-label="Solicitudes enviadas" className="rounded-3xl border bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock className="size-4 text-muted-foreground" /> Pendientes
          </h2>
          <ul className="mt-2 divide-y">
            {outgoing.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <PersonInfo person={r.to} />
                <CancelRequestButton id={r.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
