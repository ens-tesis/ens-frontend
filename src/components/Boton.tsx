"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primario" | "sutil";

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
  children: ReactNode;
}

const CLASES_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon disabled:cursor-not-allowed disabled:opacity-50";

// Botones grandes de fondo sólido: es justo el uso que la paleta pide
// para violeta/celeste (ver nota de contraste en globals.css).
const CLASES_VARIANTE: Record<Variante, string> = {
  primario: "bg-violeta text-carbon hover:bg-violeta-hover",
  sutil: "border border-carbon/20 text-carbon hover:bg-carbon/5",
};

export function Boton({
  variante = "primario",
  cargando = false,
  disabled,
  className,
  children,
  ...props
}: BotonProps) {
  return (
    <button
      type="button"
      disabled={disabled || cargando}
      className={`${CLASES_BASE} ${CLASES_VARIANTE[variante]} ${className ?? ""}`}
      {...props}
    >
      {cargando ? "Un momento..." : children}
    </button>
  );
}
