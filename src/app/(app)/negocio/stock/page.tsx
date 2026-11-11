import type { Metadata } from "next";
import { SectionPage } from "../section-page";

export const metadata: Metadata = { title: "Stock y servicios · Mi negocio · Bingo" };

export default function Page({ searchParams }: PageProps<"/negocio/stock">) {
  return <SectionPage section="stock" searchParams={searchParams} />;
}
