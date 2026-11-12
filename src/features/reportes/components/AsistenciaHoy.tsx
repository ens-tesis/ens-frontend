"use client";

import { useState } from "react";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Pestanas } from "@/shared/components/Pestanas";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { useClasesDeHoy } from "../hooks/useAsistencia";
import { AsistenciaClase } from "./AsistenciaClase";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

// Docente: la asistencia de su clase de hoy (si abrió varias, elige cuál).
export function AsistenciaHoy() {
  const q = useClasesDeHoy();
  const [elegida, setElegida] = useState<string | null>(null);

  if (q.isPending) return <MensajeEstado tipo="cargando">Buscando tus clases de hoy...</MensajeEstado>;
  if (q.isError) return <MensajeEstado tipo="error">No se pudieron cargar tus clases. Recargá la página.</MensajeEstado>;
  const clases = q.data;
  if (clases.length === 0) {
    return (
      <Tarjeta>
        <MensajeEstado tipo="vacio">Hoy no abriste ninguna clase. La asistencia aparece acá apenas empieza una.</MensajeEstado>
      </Tarjeta>
    );
  }
  const codigo = elegida && clases.some((c) => c.codigo === elegida) ? elegida : clases[0]!.codigo;

  return (
    <div className="space-y-5">
      {clases.length > 1 && (
        <Pestanas
          etiqueta="Clases de hoy"
          opciones={clases.map((c) => ({ id: c.codigo, etiqueta: `${hora(c.iniciadaAt)} · ${c.curso ?? c.codigo}` }))}
          activa={codigo}
          onCambiar={setElegida}
        />
      )}
      <AsistenciaClase codigo={codigo} />
    </div>
  );
}
