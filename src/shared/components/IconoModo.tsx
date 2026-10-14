interface IconoModoProps {
  modo: "directo" | "mirror";
  className?: string;
}

// Un signo visual rápido de qué tipo de recurso es, sin depender de leer
// el texto "(modo lectura)" — un link externo clásico para "directo", un
// documento/libro para "mirror" (lectura). currentColor: hereda el color
// de texto de donde se use, no inventa un tono nuevo fuera de la paleta.
export function IconoModo({ modo, className }: IconoModoProps) {
  if (modo === "mirror") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <path
          d="M4 4.5A1.5 1.5 0 0 1 5.5 3H10v14H5.5A1.5 1.5 0 0 1 4 15.5z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M16 4.5A1.5 1.5 0 0 0 14.5 3H10v14h4.5a1.5 1.5 0 0 0 1.5-1.5z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M8.5 11.5 15 5M11 4h4.5a.5.5 0 0 1 .5.5V9M14.5 11v4a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
