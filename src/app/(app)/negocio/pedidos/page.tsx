import type { Metadata } from "next";
import { SectionPage } from "../section-page";

export const metadata: Metadata = { title: "Pedidos · Mi negocio · Bingo" };

export default function Page({ searchParams }: PageProps<"/negocio/pedidos">) {
  return <SectionPage section="pedidos" searchParams={searchParams} />;
}
