import type { ReactNode } from "react";

type VarianteTarjeta = "normal" | "destacada";

interface TarjetaProps {
  variante?: VarianteTarjeta;
  children: ReactNode;
  className?: string;
}

// "normal": tinte sutil de carbon sobre el fondo arena (no un color
// nuevo, solo opacidad del mismo token) para separar visualmente la
// tarjeta sin salirse de la paleta.
// "destacada": superficie oscura verde + texto arena, para lo que
// necesita máximo protagonismo (código de sesión, headers).
const CLASES: Record<VarianteTarjeta, string> = {
  normal: "bg-carbon/5 border border-carbon/10",
  destacada: "bg-verde text-arena",
};

export function Tarjeta({ variante = "normal", children, className }: TarjetaProps) {
  return (
    <div className={`rounded-xl p-6 ${CLASES[variante]} ${className ?? ""}`}>{children}</div>
  );
}
