import type { Metadata } from "next";
import { SectionPage } from "../section-page";

export const metadata: Metadata = { title: "Gastos y compras · Mi negocio · Bingo" };

export default function Page({ searchParams }: PageProps<"/negocio/gastos">) {
  return <SectionPage section="gastos" searchParams={searchParams} />;
}
