"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";
import { COLOR_ESTADO, ETIQUETA_DESCONEXION, ETIQUETA_ESTADO } from "@/shared/lib/presencia";
import type { ParticipanteConectado } from "@/shared/types/sesiones";
import { armarRegistro, duracion, type EntradaRegistro, type EventoClase } from "../lib/registro";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour12: false });

// Eventos de la clase en vivo: cada cambio de estado de un alumno ya llega
// como participantes_update por WebSocket, así que ese es el aviso para
// volver a pedir el registro (sin polling).
export function useRegistroClase(codigo: string | null, participantes: ParticipanteConectado[]) {
  const query = useQuery({
    queryKey: ["sesion", codigo, "eventos"],
    queryFn: () =>
      api.get<{ eventos: EventoClase[] }>(`/sesiones/${codigo}/eventos`).then((r) => armarRegistro(r.data.eventos)),
    enabled: Boolean(codigo),
  });
  const { refetch } = query;
  useEffect(() => {
    if (codigo) void refetch();
  }, [participantes, codigo, refetch]);
  return query;
}

export function RegistroClase({
  entradas,
  cargando,
  error,
  participantes,
}: {
  entradas: EntradaRegistro[];
  cargando: boolean;
  error: boolean;
  participantes: ParticipanteConectado[];
}) {
  if (cargando) return <MensajeEstado tipo="cargando">Cargando registro...</MensajeEstado>;
  if (error) return <MensajeEstado tipo="error">No se pudo cargar el registro de la clase.</MensajeEstado>;
  if (entradas.length === 0) {
    return (
      <Tarjeta>
        <MensajeEstado tipo="vacio">Nada para revisar: nadie se distrajo ni perdió la conexión todavía.</MensajeEstado>
      </Tarjeta>
    );
  }

  const nombres = new Map(participantes.map((p) => [p.alumnoId, p]));

  return (
    <ul className="space-y-2">
      {entradas.map((e) => {
        const p = nombres.get(e.alumnoId);
        const nombre = p ? `${p.nombre} ${p.apellido}` : `Alumno #${e.alumnoId}`;
        const iniciales = p ? `${p.nombre[0] ?? ""}${p.apellido[0] ?? ""}`.toUpperCase() : "?";
        return (
          <li
            key={`${e.alumnoId}-${e.desde}`}
            className={`${CLASE_FILA} flex items-center gap-3 bg-white p-3 pr-4 shadow-tarjeta`}
          >
            <span className="w-16 shrink-0 text-xs text-carbon/55 tabular-nums">{hora(e.desde)}</span>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-arena text-xs font-bold text-carbon">
              {iniciales}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-carbon">{nombre}</span>
              <span className="block truncate text-xs text-carbon/60">
                {e.hasta
                  ? e.estado === "desconectado"
                    ? `volvió a los ${duracion(e.desde, e.hasta)}`
                    : `duró ${duracion(e.desde, e.hasta)}`
                  : e.estado === "desconectado"
                    ? "no volvió"
                    : "sigue así"}
                {e.tipoDesconexion && ` · ${ETIQUETA_DESCONEXION[e.tipoDesconexion] ?? e.tipoDesconexion}`}
              </span>
            </span>
            <Badge variante={COLOR_ESTADO[e.estado]} punto={!e.hasta}>
              {ETIQUETA_ESTADO[e.estado]}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
