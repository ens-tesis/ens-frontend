import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ENS — Entorno de Navegación Supervisado",
    short_name: "ENS",
    description: "Supervisión de navegación web en clase",
    start_url: "/",
    display: "standalone",
    background_color: "#eae2b7",
    theme_color: "#14342b",
    // ponytail: solo SVG; algunos navegadores piden PNG 192/512 para
    // ofrecer "instalar". Agregarlos si el prompt de instalación no aparece.
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
