import type { MetadataRoute } from "next";

// Permite instalar la app en la pantalla de inicio (PWA) y abrirla sin la barra del navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis Gastos",
    short_name: "Mis Gastos",
    description: "Registra ingresos y gastos y analiza tus finanzas mensuales",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#171717",
    lang: "es",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
