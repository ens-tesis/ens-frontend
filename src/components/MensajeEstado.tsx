import type { ReactNode } from "react";

type TipoMensaje = "cargando" | "error" | "vacio" | "info" | "exito";

interface MensajeEstadoProps {
  tipo: TipoMensaje;
  children: ReactNode;
}

const CLASES: Record<TipoMensaje, string> = {
  cargando: "text-carbon/70",
  error: "text-error font-medium",
  vacio: "text-carbon/60",
  info: "text-carbon/70",
  exito: "text-verde font-medium",
};

export function MensajeEstado({ tipo, children }: MensajeEstadoProps) {
  return (
    <p role={tipo === "error" ? "alert" : undefined} className={`text-sm ${CLASES[tipo]}`}>
      {children}
    </p>
  );
}
