"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { CLASE_CONTROL, CLASE_ETIQUETA } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { FiltroPeriodo } from "./Historial";
import type { Curso, Periodo, PlanillaAsistencia } from "./types";

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

// GET /asistencia: el backend recorta por rol (docente → solo sus clases).
export function useAsistencia(cursoId: number | null, periodo: Periodo = { desde: "", hasta: "" }) {
  return useQuery({
    queryKey: ["asistencia", cursoId, periodo],
    queryFn: () =>
      api
        .get<PlanillaAsistencia>("/asistencia", {
          params: {
            cursoId,
            ...(periodo.desde && { desde: periodo.desde }),
            ...(periodo.hasta && { hasta: periodo.hasta }),
          },
        })
        .then((r) => r.data),
    enabled: cursoId !== null,
  });
}

const CELDA = {
  ausente: { simbolo: "✗", clase: "bg-error/15 text-error", texto: "No se conectó" },
  presente: { simbolo: "✓", clase: "bg-verde/15 text-verde", texto: "Presente" },
  infraccion: { simbolo: "!", clase: "bg-alerta/30 text-carbon", texto: "Presente con infracciones" },
} as const;

/**
 * Planilla de asistencia por clase: todos los alumnos del curso contra
 * cada clase, con si se conectaron y si infringieron la norma de estar
 * conectados (llegar tarde, ausente digital, irse antes, quedarse sin red,
 * superar el umbral de distracciones). La usan docente, preceptor y
 * dirección.
 */
export function Asistencia({ cursos }: { cursos: Curso[] }) {
  // Sin elección todavía, el primero (los cursos pueden llegar después).
  const [elegido, setCursoId] = useState("");
  const cursoId = elegido || (cursos[0] ? String(cursos[0].id) : "");
  const [periodo, setPeriodo] = useState<Periodo>({ desde: "", hasta: "" });
  const [celda, setCelda] = useState<{ alumnoId: number; sesionId: number } | null>(null);
  const planilla = useAsistencia(cursoId ? Number(cursoId) : null, periodo);

  const d = planilla.data;
  const participacion = (alumnoId: number, sesionId: number) =>
    d?.participaciones.find((p) => p.alumnoId === alumnoId && p.sesionId === sesionId);
  const seleccion = celda && d && {
    alumno: d.alumnos.find((a) => a.id === celda.alumnoId)!,
    clase: d.clases.find((c) => c.id === celda.sesionId)!,
    participacion: participacion(celda.alumnoId, celda.sesionId),
  };

  return (
    <div className="space-y-4">
      <Tarjeta className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <label className="space-y-1.5">
          <span className={CLASE_ETIQUETA}>Curso</span>
          <select
            value={cursoId}
            onChange={(e) => {
              setCursoId(e.target.value);
              setCelda(null);
            }}
            className={CLASE_CONTROL}
          >
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.anioLectivo})
              </option>
            ))}
          </select>
        </label>
        <FiltroPeriodo valor={periodo} onChange={setPeriodo} />
      </Tarjeta>

      {cursos.length === 0 ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">No hay cursos para mostrar.</MensajeEstado>
        </Tarjeta>
      ) : planilla.isPending ? (
        <MensajeEstado tipo="cargando">Cargando asistencia...</MensajeEstado>
      ) : planilla.isError ? (
        <MensajeEstado tipo="error">No se pudo cargar la asistencia.</MensajeEstado>
      ) : d!.clases.length === 0 ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">Este curso no tuvo clases en ese período.</MensajeEstado>
        </Tarjeta>
      ) : d!.alumnos.length === 0 ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">El curso no tiene alumnos matriculados.</MensajeEstado>
        </Tarjeta>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 text-xs text-carbon/70">
            {Object.values(CELDA).map((c) => (
              <span key={c.simbolo} className="inline-flex items-center gap-1.5">
                <span className={`grid size-6 place-items-center rounded-lg font-bold ${c.clase}`}>{c.simbolo}</span>
                {c.texto}
              </span>
            ))}
          </div>
          <Tarjeta className="overflow-x-auto p-0">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-xs text-carbon/60">
                  <th className="sticky left-0 bg-white px-3 py-2 text-left font-semibold">Alumno</th>
                  <th className="px-2 py-2 font-semibold">Asistió</th>
                  <th className="px-2 py-2 font-semibold">Infr.</th>
                  {d!.clases.map((c) => (
                    <th key={c.id} title={`${fechaHora(c.iniciadaAt)} · ${c.docente}`} className="px-1 py-2 font-medium tabular-nums">
                      {fechaCorta(c.iniciadaAt)}
                      {c.activa && <span className="block text-[10px] text-verde">en vivo</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d!.alumnos.map((a) => {
                  const propias = d!.participaciones.filter((p) => p.alumnoId === a.id);
                  const conInfraccion = propias.filter((p) => p.motivos.length > 0).length;
                  return (
                    <tr key={a.id} className="border-t border-carbon/[0.07]">
                      <th scope="row" className="sticky left-0 max-w-44 truncate bg-white px-3 py-1.5 text-left font-medium text-carbon">
                        {a.apellido}, {a.nombre}
                        {!a.matriculado && <span className="block text-[10px] font-normal text-carbon/55">no matriculado</span>}
                      </th>
                      <td className="px-2 text-center tabular-nums">
                        {propias.length}/{d!.clases.length}
                      </td>
                      <td className="px-2 text-center tabular-nums">{conInfraccion}</td>
                      {d!.clases.map((c) => {
                        const p = participacion(a.id, c.id);
                        const tipo = !p ? CELDA.ausente : p.motivos.length ? CELDA.infraccion : CELDA.presente;
                        const activa = celda?.alumnoId === a.id && celda.sesionId === c.id;
                        return (
                          <td key={c.id} className="px-1 py-1 text-center">
                            <button
                              type="button"
                              aria-label={`${a.apellido} ${fechaCorta(c.iniciadaAt)}: ${tipo.texto}`}
                              aria-pressed={activa}
                              onClick={() => setCelda(activa ? null : { alumnoId: a.id, sesionId: c.id })}
                              className={`grid size-8 place-items-center rounded-lg font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon ${tipo.clase} ${activa ? "ring-2 ring-carbon" : ""}`}
                            >
                              {tipo.simbolo}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Tarjeta>
          {seleccion && (
            <Tarjeta className="space-y-2">
              <p className="text-sm font-semibold text-carbon">
                {seleccion.alumno.nombre} {seleccion.alumno.apellido} · {fechaHora(seleccion.clase.iniciadaAt)} ·{" "}
                {seleccion.clase.docente}
              </p>
              {!seleccion.participacion ? (
                <Badge variante="rojo">No se conectó a esta clase</Badge>
              ) : seleccion.participacion.motivos.length === 0 ? (
                <Badge variante="verde">Presente, sin infracciones</Badge>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {seleccion.participacion.motivos.map((m) => (
                    <Badge key={m} variante="amarillo">
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
            </Tarjeta>
          )}
        </>
      )}
    </div>
  );
}
