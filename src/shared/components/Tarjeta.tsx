import type { ReactNode } from "react";

type VarianteTarjeta = "normal" | "destacada";

interface TarjetaProps {
  variante?: VarianteTarjeta;
  children: ReactNode;
  className?: string;
}

// "normal": superficie blanca elevada sobre el fondo papel.
// "destacada": pizarrón verde + texto arena, para lo que necesita máximo
// protagonismo (código de sesión).
const CLASES: Record<VarianteTarjeta, string> = {
  normal: "bg-white border border-carbon/[0.07] shadow-tarjeta",
  destacada: "pizarron text-arena shadow-flotante",
};

export function Tarjeta({ variante = "normal", children, className }: TarjetaProps) {
  return (
    <div className={`rounded-3xl p-5 sm:p-6 ${CLASES[variante]} ${className ?? ""}`}>{children}</div>
  );
}

// Fila dentro de una tarjeta (listas de sesiones, alumnos, URLs...).
export const CLASE_FILA = "rounded-2xl border border-carbon/[0.07] bg-papel/70";
export const CLASE_FILA_INTERACTIVA = `${CLASE_FILA} transition-colors hover:border-carbon/15 hover:bg-papel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon`;
