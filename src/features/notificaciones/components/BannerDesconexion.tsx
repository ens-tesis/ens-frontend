"use client";

import { useState } from "react";
import { useNotificaciones } from "../hooks/useNotificaciones";

// La única alerta que interrumpe: un alumno se desconectó. Franja roja
// bajo la barra superior mientras la alerta siga abierta (desaparece sola
// cuando vuelve) o hasta que se la cierre a mano.
export function BannerDesconexion() {
  const { abiertas } = useNotificaciones();
  const [cerradas, setCerradas] = useState<number[]>([]);
  const desconectados = abiertas.filter((n) => n.tipo === "desconectado" && !cerradas.includes(n.id));
  if (desconectados.length === 0) return null;

  const [primero] = desconectados;
  const otros = desconectados.length - 1;
  const texto =
    otros === 0
      ? `${primero!.alumnoNombre} se DESCONECTÓ`
      : `${primero!.alumnoNombre} y ${otros} ${otros === 1 ? "alumno más se DESCONECTARON" : "alumnos más se DESCONECTARON"}`;

  return (
    <div role="alert" className="entrar bg-error text-arena">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-10">
        <span aria-hidden="true" className="size-2.5 shrink-0 animate-pulse rounded-full bg-arena" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {texto}
          {primero!.sesionCodigo && <span className="font-normal text-arena/75"> · clase {primero!.sesionCodigo}</span>}
        </p>
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={() => setCerradas((c) => [...c, ...desconectados.map((n) => n.id)])}
          className="grid size-8 shrink-0 place-items-center rounded-full text-arena/80 hover:bg-arena/15 hover:text-arena focus-visible:outline focus-visible:outline-2 focus-visible:outline-arena"
        >
          <span aria-hidden="true" className="text-lg leading-none">×</span>
        </button>
      </div>
    </div>
  );
}
