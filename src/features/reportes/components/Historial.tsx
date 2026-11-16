"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { CLASE_CONTROL, CLASE_ETIQUETA } from "@/shared/components/Campo";
import { FiltroPeriodo, type Periodo } from "@/shared/components/FiltroPeriodo";
import { Volver } from "@/shared/components/Volver";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Pestanas } from "@/shared/components/Pestanas";
import { CLASE_FILA, CLASE_FILA_INTERACTIVA, Tarjeta } from "@/shared/components/Tarjeta";
import { cantidad, COLOR_ESTADO, ETIQUETA_DESCONEXION, ETIQUETA_ESTADO, formatoDuracion } from "@/shared/lib/presencia";
import type {
  ConteosEventos,
  EventoPresencia,
  ParticipanteDetalle,
  SesionDeAlumno,
  SesionResumen,
} from "../types";
import { useCursos } from "@/features/cursos";

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", hour12: false });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { timeStyle: "medium", hour12: false });
const horaCorta = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { timeStyle: "short", hour12: false });

// Infracción pedagógica vs incidente técnico (anteproyecto: filtrado por
// tipo de desconexión).
type FiltroEventos = "todos" | "pedagogicos" | "tecnicos";

type Evento = Omit<EventoPresencia, "alumnoId">;

function clasificar(e: Evento): FiltroEventos | null {
  if (
    e.estado === "fuera_de_foco" ||
    e.estado === "ausente_digital" ||
    e.estado === "actividad_reducida"
  )
    return "pedagogicos";
  if (
    e.estado === "sin_red" ||
    e.estado === "pantalla_suspendida" ||
    e.tipoDesconexion === "HEARTBEAT_TIMEOUT"
  )
    return "tecnicos";
  return null;
}

// Línea de tiempo de un alumno en una clase: hora, estado y tipo de
// desconexión (detalle de sesión e historial por alumno).
function ListaEventos({ eventos }: { eventos: Evento[] }) {
  if (eventos.length === 0) return <p className="text-xs text-carbon/55">Sin eventos de este tipo.</p>;
  return (
    <ol className="space-y-1.5 border-l-2 border-carbon/10 pl-3 text-xs text-carbon/80">
      {eventos.map((e, i) => (
        <li key={i} className="flex flex-wrap gap-x-2">
          <span className="font-mono text-carbon/55 tabular-nums">{hora(e.ts)}</span>
          <span className="font-medium">{ETIQUETA_ESTADO[e.estado]}</span>
          {e.tipoDesconexion && (
            <span className="text-carbon/55">{ETIQUETA_DESCONEXION[e.tipoDesconexion] ?? e.tipoDesconexion}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

function params(periodo: Periodo, extra: Record<string, string | number | undefined> = {}) {
  const p: Record<string, string | number> = {};
  if (periodo.desde) p.desde = periodo.desde;
  if (periodo.hasta) p.hasta = periodo.hasta;
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== "") p[k] = v;
  return p;
}

function Conteos({ c }: { c: ConteosEventos }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variante={c.distracciones ? "rojo" : "celeste"}>{cantidad(c.distracciones, "distracción", "distracciones")}</Badge>
      {c.segundosFueraDeFoco > 0 && (
        <Badge variante="rojo">{formatoDuracion(c.segundosFueraDeFoco)} fuera de foco</Badge>
      )}
      <Badge variante={c.ausenciasDigitales ? "rojo" : "celeste"}>
        {cantidad(c.ausenciasDigitales, "ausencia digital", "ausencias digitales")}
      </Badge>
      <Badge variante={c.cortesDeRed ? "amarillo" : "celeste"}>{cantidad(c.cortesDeRed, "corte de red", "cortes de red")}</Badge>
    </div>
  );
}

// Hoja de calendario: el día grande es lo que se busca al recorrer la lista.
function Fecha({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <span className="flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-2xl border border-carbon/[0.07] bg-white text-center">
      <span className="w-full bg-verde py-0.5 text-[10px] font-semibold tracking-wider text-arena uppercase">
        {d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "")}
      </span>
      <span className="font-display text-2xl leading-9 font-bold text-carbon">{d.getDate()}</span>
    </span>
  );
}

type Vista =
  | { tipo: "lista" }
  | { tipo: "sesion"; sesion: SesionResumen }
  | { tipo: "alumno"; alumnoId: number; nombre: string };

/**
 * Historial de sesiones (US-PC-01 / anteproyecto: "historial de sesiones
 * por curso: fecha, docente, alumnos presentes/ausentes y tipo de evento
 * de desconexión"). Lo usan preceptor (solo sus cursos, lo filtra el
 * backend) y director (toda la institución).
 */
export function Historial() {
  const cursos = useCursos().data ?? [];
  const [vista, setVista] = useState<Vista>({ tipo: "lista" });
  const [cursoId, setCursoId] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>({ desde: "", hasta: "" });

  const sesiones = useQuery({
    queryKey: ["reportes", "sesiones", cursoId, periodo],
    queryFn: () =>
      api
        .get<{ sesiones: SesionResumen[] }>("/reportes/sesiones", {
          params: params(periodo, { cursoId }),
        })
        .then((r) => r.data.sesiones),
    enabled: vista.tipo === "lista",
  });

  if (vista.tipo === "sesion") {
    return (
      <DetalleSesion
        sesion={vista.sesion}
        onVolver={() => setVista({ tipo: "lista" })}
        onAlumno={(alumnoId, nombre) => setVista({ tipo: "alumno", alumnoId, nombre })}
      />
    );
  }
  if (vista.tipo === "alumno") {
    return (
      <HistorialAlumno
        alumnoId={vista.alumnoId}
        nombre={vista.nombre}
        onVolver={() => setVista({ tipo: "lista" })}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Tarjeta className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <label className="space-y-1.5">
          <span className={CLASE_ETIQUETA}>Curso</span>
          <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={CLASE_CONTROL}>
            <option value="">Todos los cursos</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.anioLectivo})
              </option>
            ))}
          </select>
        </label>
        <FiltroPeriodo valor={periodo} onChange={setPeriodo} />
      </Tarjeta>

      {sesiones.isPending ? (
        <MensajeEstado tipo="cargando">Cargando clases...</MensajeEstado>
      ) : sesiones.isError ? (
        <MensajeEstado tipo="error">No se pudo cargar el historial.</MensajeEstado>
      ) : sesiones.data.length === 0 ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">No hay clases para ese filtro. Probá con otro curso o fechas.</MensajeEstado>
        </Tarjeta>
      ) : (
        <ul className="space-y-2">
          {sesiones.data.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setVista({ tipo: "sesion", sesion: s })}
                className={`${CLASE_FILA_INTERACTIVA} flex w-full items-center gap-4 bg-white p-3 pr-4 text-left shadow-tarjeta`}
              >
                <Fecha iso={s.iniciadaAt} />
                <span className="min-w-0 flex-1 space-y-2">
                  <span className="block">
                    <span className="block truncate font-semibold text-carbon">{s.curso ?? "Sin curso"}</span>
                    <span className="block truncate text-xs text-carbon/60">
                      {s.docente} · {fechaHora(s.iniciadaAt)} · {cantidad(s.participantes, "alumno", "alumnos")}
                    </span>
                  </span>
                  <Conteos c={s} />
                </span>
                <Icono nombre="flecha" className="size-5 shrink-0 text-carbon/40" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DetalleSesion({
  sesion,
  onVolver,
  onAlumno,
}: {
  sesion: SesionResumen;
  onVolver: () => void;
  onAlumno: (alumnoId: number, nombre: string) => void;
}) {
  const [filtro, setFiltro] = useState<FiltroEventos>("todos");
  const detalle = useQuery({
    queryKey: ["reportes", "sesion", sesion.id],
    queryFn: () =>
      api
        .get<{ participantes: ParticipanteDetalle[]; eventos: EventoPresencia[] }>(
          `/reportes/sesiones/${sesion.id}`,
        )
        .then((r) => r.data),
  });

  return (
    <div className="entrar space-y-4">
      <Volver onClick={onVolver}>Historial</Volver>
      <Tarjeta className="flex items-center gap-4">
        <Fecha iso={sesion.iniciadaAt} />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold text-carbon">{sesion.curso ?? "Sin curso"}</h2>
          <p className="text-sm text-carbon/65">
            {sesion.docente} · {fechaHora(sesion.iniciadaAt)} · código{" "}
            <span className="font-mono">{sesion.codigo}</span>
          </p>
        </div>
      </Tarjeta>

      <Pestanas
        etiqueta="Eventos a mostrar"
        opciones={[
          { id: "todos", etiqueta: "Todos" },
          { id: "pedagogicos", etiqueta: "Foco" },
          { id: "tecnicos", etiqueta: "Red" },
        ]}
        activa={filtro}
        onCambiar={setFiltro}
      />

      {detalle.isPending ? (
        <MensajeEstado tipo="cargando">Cargando detalle...</MensajeEstado>
      ) : detalle.isError ? (
        <MensajeEstado tipo="error">No se pudo cargar la sesión.</MensajeEstado>
      ) : detalle.data.participantes.length === 0 ? (
        <MensajeEstado tipo="vacio">Ningún alumno se unió a esta clase.</MensajeEstado>
      ) : (
        <ul className="space-y-2">
          {detalle.data.participantes.map((p) => {
            const eventos = detalle.data.eventos.filter(
              (e) => e.alumnoId === p.alumnoId && (filtro === "todos" || clasificar(e) === filtro),
            );
            const nombre = `${p.nombre} ${p.apellido}`.trim();
            return (
              <li key={p.alumnoId} className={`${CLASE_FILA} space-y-3 bg-white p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onAlumno(p.alumnoId, nombre)}
                    className="flex min-h-9 items-center gap-1 text-left text-sm font-semibold text-carbon hover:underline hover:underline-offset-2"
                  >
                    {nombre}
                    <Icono nombre="flecha" className="size-4 text-carbon/40" />
                  </button>
                  <Badge variante={COLOR_ESTADO[p.estadoFinal]} punto>
                    {ETIQUETA_ESTADO[p.estadoFinal]}
                  </Badge>
                </div>
                <ListaEventos eventos={eventos} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function HistorialAlumno({
  alumnoId,
  nombre,
  onVolver,
}: {
  alumnoId: number;
  nombre: string;
  onVolver: () => void;
}) {
  const [periodo, setPeriodo] = useState<Periodo>({ desde: "", hasta: "" });
  const [filtro, setFiltro] = useState<FiltroEventos>("todos");
  const historial = useQuery({
    queryKey: ["reportes", "alumno", alumnoId, periodo],
    queryFn: () =>
      api
        .get<{ sesiones: SesionDeAlumno[] }>(`/reportes/alumnos/${alumnoId}`, { params: params(periodo) })
        .then((r) => r.data.sesiones),
  });

  return (
    <div className="entrar space-y-4">
      <Volver onClick={onVolver}>Volver</Volver>
      <Tarjeta className="space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-carbon/50 uppercase">Asistencia digital</p>
          <h2 className="font-display text-2xl font-bold text-carbon">{nombre}</h2>
        </div>
        <FiltroPeriodo valor={periodo} onChange={setPeriodo} />
      </Tarjeta>
      {historial.isPending ? (
        <MensajeEstado tipo="cargando">Cargando...</MensajeEstado>
      ) : historial.isError ? (
        <MensajeEstado tipo="error">No se pudo cargar el historial del alumno.</MensajeEstado>
      ) : historial.data.length === 0 ? (
        <MensajeEstado tipo="vacio">No participó de clases en ese período.</MensajeEstado>
      ) : (
        <>
          <Pestanas
            etiqueta="Eventos a mostrar"
            opciones={[
              { id: "todos", etiqueta: "Todos" },
              { id: "pedagogicos", etiqueta: "Foco" },
              { id: "tecnicos", etiqueta: "Red" },
            ]}
            activa={filtro}
            onCambiar={setFiltro}
          />
          <ul className="space-y-2">
            {historial.data.map((s) => {
              const eventos = s.eventos.filter((e) => filtro === "todos" || clasificar(e) === filtro);
              return (
                <li key={s.sesionId} className={`${CLASE_FILA} space-y-3 bg-white p-3 pr-4`}>
                  <div className="flex items-center gap-4">
                    <Fecha iso={s.iniciadaAt} />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm">
                          <span className="font-semibold text-carbon">{s.curso ?? "Sin curso"}</span>
                          <span className="text-carbon/60">
                            {" "}
                            · {s.docente} · <span className="tabular-nums">{horaCorta(s.iniciadaAt)} h</span>
                          </span>
                        </p>
                        <Badge variante={COLOR_ESTADO[s.estadoFinal]} punto>
                          {ETIQUETA_ESTADO[s.estadoFinal]}
                        </Badge>
                      </div>
                      <Conteos c={s} />
                    </div>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-xs font-semibold text-carbon/70 select-none">
                      Ver eventos ({eventos.length})
                    </summary>
                    <div className="mt-2">
                      <ListaEventos eventos={eventos} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
