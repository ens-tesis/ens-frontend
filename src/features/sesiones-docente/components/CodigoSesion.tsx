"use client";

import { useState } from "react";
import { Icono } from "@/shared/components/Icono";

interface CodigoSesionProps {
  codigo: string;
  // "En vivo" / "Reconectando..." según el socket.
  estado: string;
  enVivo: boolean;
}

// El código escrito en el pizarrón: lo primero que el docente le muestra a
// la clase, así que es lo más grande de la pantalla.
export function CodigoSesion({ codigo, estado, enVivo }: CodigoSesionProps) {
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
    <section
      aria-label="Código de la clase"
      className="pizarron relative overflow-hidden rounded-[2rem] px-6 pt-5 pb-6 text-arena shadow-flotante sm:px-10 sm:pt-7 sm:pb-9"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.16em] text-arena/65 uppercase">Código de la clase</p>
        <span className="flex items-center gap-2 rounded-full bg-arena/10 px-3 py-1 text-xs font-semibold">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${enVivo ? "latido bg-celeste text-celeste" : "bg-alerta"}`}
          />
          {estado}
        </span>
      </div>
      <p className="mt-4 font-mono text-[clamp(2.75rem,14vw,6.5rem)] leading-none font-bold tracking-[0.18em] sm:mt-6">
        {codigo}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
        <button
          type="button"
          onClick={() => void copiar()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violeta px-4 text-sm font-semibold text-carbon transition-transform hover:bg-violeta-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arena"
        >
          <Icono nombre="copiar" className="size-4" />
          {copiado ? "¡Copiado!" : "Copiar código"}
        </button>
        <p className="text-sm text-arena/70">Los alumnos lo ingresan en su pantalla para unirse.</p>
      </div>
    </section>
  );
}
