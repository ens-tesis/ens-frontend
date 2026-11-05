"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
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

const CLASE_SELECT =
  "min-h-11 w-full rounded-lg border border-carbon/20 bg-arena px-3.5 py-2.5 text-base text-carbon";

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
        <label key={campo} className="space-y-1.5 text-sm font-medium text-carbon">
          <span className="block capitalize">{campo}</span>
          <input
            type="date"
            value={valor[campo]}
            onChange={(e) => onChange({ ...valor, [campo]: e.target.value })}
            className={CLASE_SELECT}
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
      <h2 className="text-lg font-semibold text-carbon">Historial de sesiones</h2>
      <label className="block space-y-1.5 text-sm font-medium text-carbon">
        <span>Curso</span>
        <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={CLASE_SELECT}>
          <option value="">Todos los cursos</option>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.anioLectivo})
            </option>
          ))}
        </select>
      </label>
      <FiltroPeriodo valor={periodo} onChange={setPeriodo} />

      {sesiones.isPending ? (
        <MensajeEstado tipo="cargando">Cargando sesiones...</MensajeEstado>
      ) : sesiones.isError ? (
        <MensajeEstado tipo="error">No se pudo cargar el historial.</MensajeEstado>
      ) : sesiones.data.length === 0 ? (
        <MensajeEstado tipo="vacio">No hay sesiones para ese filtro.</MensajeEstado>
      ) : (
        <ul className="space-y-2">
          {sesiones.data.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setVista({ tipo: "sesion", sesion: s })}
                className="w-full space-y-2 rounded-lg border border-carbon/10 bg-arena px-4 py-3 text-left hover:bg-carbon/5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-carbon">
                    {s.curso ?? "Sin curso"} · {s.docente}
                  </span>
                  <span className="text-xs text-carbon/60">
                    {fechaHora(s.iniciadaAt)} · código {s.codigo}
                  </span>
                </div>
                <p className="text-sm text-carbon/70">{s.participantes} alumnos</p>
                <Conteos c={s} />
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
    <div className="space-y-4">
      <Boton variante="sutil" onClick={onVolver}>
        ← Volver al historial
      </Boton>
      <div>
        <h2 className="text-lg font-semibold text-carbon">
          {sesion.curso ?? "Sin curso"} · {fechaHora(sesion.iniciadaAt)}
        </h2>
        <p className="text-sm text-carbon/70">
          Docente: {sesion.docente} · código {sesion.codigo}
        </p>
      </div>
      <label className="block space-y-1.5 text-sm font-medium text-carbon">
        <span>Eventos a mostrar</span>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as FiltroEventos)}
          className={CLASE_SELECT}
        >
          <option value="todos">Todos</option>
          <option value="pedagogicos">Infracciones pedagógicas (foco)</option>
          <option value="tecnicos">Incidentes técnicos (red)</option>
        </select>
      </label>

      {detalle.isPending ? (
        <MensajeEstado tipo="cargando">Cargando detalle...</MensajeEstado>
      ) : detalle.isError ? (
        <MensajeEstado tipo="error">No se pudo cargar la sesión.</MensajeEstado>
      ) : detalle.data.participantes.length === 0 ? (
        <MensajeEstado tipo="vacio">Ningún alumno se unió a esta sesión.</MensajeEstado>
      ) : (
        <ul className="space-y-3">
          {detalle.data.participantes.map((p) => {
            const eventos = detalle.data.eventos.filter(
              (e) => e.alumnoId === p.alumnoId && (filtro === "todos" || clasificar(e) === filtro),
            );
            const nombre = `${p.nombre} ${p.apellido}`.trim();
            return (
              <li key={p.alumnoId} className="space-y-2 rounded-lg border border-carbon/10 bg-arena px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onAlumno(p.alumnoId, nombre)}
                    className="text-sm font-medium text-carbon underline underline-offset-2"
                  >
                    {nombre}
                  </button>
                  <Badge variante={COLOR_ESTADO[p.estadoFinal]}>{ETIQUETA_ESTADO[p.estadoFinal]}</Badge>
                </div>
                {eventos.length === 0 ? (
                  <p className="text-xs text-carbon/60">Sin eventos de este tipo.</p>
                ) : (
                  <ol className="space-y-1 text-xs text-carbon/80">
                    {eventos.map((e, i) => (
                      <li key={i} className="flex flex-wrap gap-x-2">
                        <span className="font-mono text-carbon/60">{hora(e.ts)}</span>
                        <span>{ETIQUETA_ESTADO[e.estado]}</span>
                        {e.tipoDesconexion && (
                          <span className="text-carbon/60">
                            ({ETIQUETA_DESCONEXION[e.tipoDesconexion] ?? e.tipoDesconexion})
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
    <div className="space-y-4">
      <Boton variante="sutil" onClick={onVolver}>
        ← Volver al historial
      </Boton>
      <h2 className="text-lg font-semibold text-carbon">Asistencia digital de {nombre}</h2>
      <FiltroPeriodo valor={periodo} onChange={setPeriodo} />
      {historial.isPending ? (
        <MensajeEstado tipo="cargando">Cargando...</MensajeEstado>
      ) : historial.isError ? (
        <MensajeEstado tipo="error">No se pudo cargar el historial del alumno.</MensajeEstado>
      ) : historial.data.length === 0 ? (
        <MensajeEstado tipo="vacio">No participó de sesiones en ese período.</MensajeEstado>
      ) : (
        <ul className="space-y-2">
          {historial.data.map((s) => (
            <li key={s.sesionId} className="space-y-2 rounded-lg border border-carbon/10 bg-arena px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-carbon">
                  {s.curso ?? "Sin curso"} · {s.docente}
                </span>
                <span className="text-xs text-carbon/60">{fechaHora(s.iniciadaAt)}</span>
              </div>
              <Conteos c={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
