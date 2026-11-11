import type { Metadata } from "next";
import { SectionPage } from "../section-page";

export const metadata: Metadata = { title: "Agenda · Mi negocio · Bingo" };

export default function Page({ searchParams }: PageProps<"/negocio/agenda">) {
  return <SectionPage section="agenda" searchParams={searchParams} />;
}
