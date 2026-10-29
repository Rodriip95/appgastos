import type { Person } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

/** Foto de la persona o su inicial. */
export function PersonAvatar({ person, className }: { person: Pick<Person, "name" | "email" | "photo">; className?: string }) {
  const initial = (person.name || person.email || "?").charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-sm font-medium",
        className,
      )}
    >
      {person.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.photo} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
