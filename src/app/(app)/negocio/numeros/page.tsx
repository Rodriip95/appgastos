import type { Metadata } from "next";
import { SectionPage } from "../section-page";

export const metadata: Metadata = { title: "Números · Mi negocio · Bingo" };

export default function Page({ searchParams }: PageProps<"/negocio/numeros">) {
  return <SectionPage section="numeros" searchParams={searchParams} />;
}
