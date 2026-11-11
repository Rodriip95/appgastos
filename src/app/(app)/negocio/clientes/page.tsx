import type { Metadata } from "next";
import { SectionPage } from "../section-page";

export const metadata: Metadata = { title: "Clientes · Mi negocio · Bingo" };

export default function Page({ searchParams }: PageProps<"/negocio/clientes">) {
  return <SectionPage section="clientes" searchParams={searchParams} />;
}
