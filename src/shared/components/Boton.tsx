"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primario" | "oscuro" | "sutil";

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
  children: ReactNode;
}

const CLASES_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-[background-color,transform,border-color] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon disabled:pointer-events-none disabled:opacity-50";

// Botones grandes de fondo sólido: es justo el uso que la paleta pide
// para violeta/celeste (ver nota de contraste en globals.css).
const CLASES_VARIANTE: Record<Variante, string> = {
  primario: "bg-violeta text-carbon hover:bg-violeta-hover",
  oscuro: "bg-verde text-arena hover:bg-verde-hover",
  sutil: "border border-carbon/15 bg-white text-carbon hover:border-carbon/30",
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
      aria-busy={cargando || undefined}
      className={`${CLASES_BASE} ${CLASES_VARIANTE[variante]} ${className ?? ""}`}
      {...props}
    >
      {cargando ? "Un momento..." : children}
    </button>
  );
}
