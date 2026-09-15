import type { ReactNode } from "react";

type VarianteBadge = "celeste" | "verde";

interface BadgeProps {
  variante?: VarianteBadge;
  children: ReactNode;
}

// Relleno sólido + texto carbon: celeste/verde como fondo de un elemento
// chico, nunca como color de texto suelto (ver nota de contraste).
const CLASES: Record<VarianteBadge, string> = {
  celeste: "bg-celeste text-carbon",
  verde: "bg-verde text-arena",
};

export function Badge({ variante = "celeste", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${CLASES[variante]}`}
    >
      {children}
    </span>
  );
}
