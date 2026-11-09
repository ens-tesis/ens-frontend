import type { ReactNode } from "react";

type VarianteBadge = "celeste" | "verde" | "rojo" | "amarillo" | "gris";

interface BadgeProps {
  variante?: VarianteBadge;
  // Punto de estado a la izquierda; "vivo" le agrega el latido.
  punto?: boolean | "vivo";
  children: ReactNode;
}

// Relleno sólido + texto carbon: celeste/verde como fondo de un elemento
// chico, nunca como color de texto suelto (ver nota de contraste).
const CLASES: Record<VarianteBadge, string> = {
  celeste: "bg-celeste text-carbon",
  verde: "bg-verde text-arena",
  rojo: "bg-error text-arena",
  amarillo: "bg-alerta text-carbon",
  gris: "bg-carbon/10 text-carbon",
};

export function Badge({ variante = "celeste", punto = false, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${CLASES[variante]}`}
    >
      {punto && (
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full bg-current ${punto === "vivo" ? "latido" : ""}`}
        />
      )}
      {children}
    </span>
  );
}
