import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ENS — Entorno de Navegación Supervisado",
    short_name: "ENS",
    description: "Supervisión de navegación web en clase",
    start_url: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f2df",
    theme_color: "#14342b",
    lang: "es",
    // Chrome pide PNG 192 y 512 para ofrecer "Instalar"; maskable para que
    // Android no le agregue un borde blanco al ícono.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
