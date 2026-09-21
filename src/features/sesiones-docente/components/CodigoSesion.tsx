"use client";

import { useState } from "react";
import { Tarjeta } from "@/shared/components/Tarjeta";

interface CodigoSesionProps {
  codigo: string;
}

export function CodigoSesion({ codigo }: CodigoSesionProps) {
  const [copiado, setCopiado] = useState(false);

  async function copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard puede fallar (permisos, contexto no seguro); no es
      // crítico, el código ya está visible en pantalla igual.
    }
  }

  return (
    <Tarjeta variante="destacada" className="text-center">
      <p className="text-sm font-medium tracking-wide text-arena/80 uppercase">
        Código de la clase
      </p>
      <p className="mt-2 font-mono text-5xl font-bold tracking-[0.2em] text-arena sm:text-6xl">
        {codigo}
      </p>
      <button
        type="button"
        onClick={() => void copiar()}
        className="mt-4 min-h-11 rounded-lg border border-arena/30 px-4 py-2 text-sm font-medium text-arena transition-colors hover:bg-arena/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arena"
      >
        {copiado ? "¡Copiado!" : "Copiar código"}
      </button>
    </Tarjeta>
  );
}
