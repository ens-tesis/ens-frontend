// Set mínimo de íconos de trazo (24px, currentColor) para la navegación.
// Inline a propósito: no vale una dependencia por diez paths.
const PATHS = {
  inicio: "M3 11l9-8 9 8M5 9.5V21h14V9.5M10 21v-6h4v6",
  colegio: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5M10 10h4M10 13h4",
  metricas: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  asistencia: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  historial: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  cursos: "M3 7l9-4 9 4-9 4-9-4zM7 9v5c0 1.7 2.2 3 5 3s5-1.3 5-3V9M21 7v6",
  usuarios:
    "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.4M15.5 4.2a3.5 3.5 0 0 1 0 6.6",
  alta: "M15 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 3 18.5V20M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M22 11h-6",
  clase: "M3 5h18v11H3zM8 20h8M12 16v4M10 8.5v4l3.5-2z",
  alumnos: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  sitios: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z",
  campana: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  salir: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  volver: "M15 18l-6-6 6-6",
  flecha: "M9 18l6-6-6-6",
  copiar: "M9 9h11v11H9zM5 15H4V4h11v1",
  descargar: "M12 3v12M7 10l5 5 5-5M4 21h16",
  mas: "M12 5v14M5 12h14",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2z",
} as const;

export type NombreIcono = keyof typeof PATHS;

export function Icono({ nombre, className = "size-5" }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[nombre]} />
    </svg>
  );
}
