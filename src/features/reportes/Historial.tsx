"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { CLASE_CONTROL, CLASE_ETIQUETA } from "@/shared/components/Campo";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Pestanas } from "@/shared/components/Pestanas";
import { CLASE_FILA, CLASE_FILA_INTERACTIVA, Tarjeta } from "@/shared/components/Tarjeta";
import { COLOR_ESTADO, ETIQUETA_DESCONEXION, ETIQUETA_ESTADO } from "@/shared/lib/presencia";
import type {
  ConteosEventos,
  Curso,
  EventoPresencia,
  ParticipanteDetalle,
  Periodo,
  SesionDeAlumno,
  SesionResumen,
} from "./types";

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { timeStyle: "medium" });

// Infracción pedagógica vs incidente técnico (anteproyecto: filtrado por
// tipo de desconexión).
type FiltroEventos = "todos" | "pedagogicos" | "tecnicos";

function clasificar(e: EventoPresencia): FiltroEventos | null {
  if (e.estado === "fuera_de_foco" || e.estado === "ausente_digital") return "pedagogicos";
  if (e.estado === "sin_red" || e.tipoDesconexion === "HEARTBEAT_TIMEOUT") return "tecnicos";
  return null;
}

function params(periodo: Periodo, extra: Record<string, string | number | undefined> = {}) {
  const p: Record<string, string | number> = {};
  if (periodo.desde) p.desde = periodo.desde;
  if (periodo.hasta) p.hasta = periodo.hasta;
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== "") p[k] = v;
  return p;
}

export function FiltroPeriodo({ valor, onChange }: { valor: Periodo; onChange: (p: Periodo) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["desde", "hasta"] as const).map((campo) => (
        <label key={campo} className="space-y-1.5">
          <span className={`${CLASE_ETIQUETA} capitalize`}>{campo}</span>
          <input
            type="date"
            value={valor[campo]}
            onChange={(e) => onChange({ ...valor, [campo]: e.target.value })}
            className={CLASE_CONTROL}
          />
        </label>
      ))}
    </div>
  );
}

function Conteos({ c }: { c: ConteosEventos }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variante={c.distracciones ? "rojo" : "celeste"}>{c.distracciones} distracciones</Badge>
      <Badge variante={c.ausenciasDigitales ? "rojo" : "celeste"}>
        {c.ausenciasDigitales} ausencias digitales
      </Badge>
      <Badge variante={c.cortesDeRed ? "amarillo" : "celeste"}>{c.cortesDeRed} cortes de red</Badge>
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

export function Volver({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-carbon/70 hover:text-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
    >
      <Icono nombre="volver" className="size-4" />
      {children}
    </button>
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
export function Historial({ cursos }: { cursos: Curso[] }) {
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
                      {s.docente} · {fechaHora(s.iniciadaAt)} · {s.participantes} alumnos
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
                {eventos.length === 0 ? (
                  <p className="text-xs text-carbon/55">Sin eventos de este tipo.</p>
                ) : (
                  <ol className="space-y-1.5 border-l-2 border-carbon/10 pl-3 text-xs text-carbon/80">
                    {eventos.map((e, i) => (
                      <li key={i} className="flex flex-wrap gap-x-2">
                        <span className="font-mono text-carbon/55 tabular-nums">{hora(e.ts)}</span>
                        <span className="font-medium">{ETIQUETA_ESTADO[e.estado]}</span>
                        {e.tipoDesconexion && (
                          <span className="text-carbon/55">
                            {ETIQUETA_DESCONEXION[e.tipoDesconexion] ?? e.tipoDesconexion}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
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
        <ul className="space-y-2">
          {historial.data.map((s) => (
            <li key={s.sesionId} className={`${CLASE_FILA} flex items-center gap-4 bg-white p-3 pr-4`}>
              <Fecha iso={s.iniciadaAt} />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-sm">
                  <span className="font-semibold text-carbon">{s.curso ?? "Sin curso"}</span>
                  <span className="text-carbon/60"> · {s.docente}</span>
                </p>
                <Conteos c={s} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
