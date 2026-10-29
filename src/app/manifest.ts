import type { MetadataRoute } from "next";

// Permite instalar la app en la pantalla de inicio (PWA) y abrirla sin la barra del navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bingo",
    short_name: "Bingo",
    description: "Bingo cuida tu billetera: ingresos, gastos, presupuestos y metas de ahorro",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fffaf6",
    theme_color: "#9c3b22",
    lang: "es",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
