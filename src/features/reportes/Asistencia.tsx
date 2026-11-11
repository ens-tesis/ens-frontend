"use client";

import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { CLASE_CONTROL, CLASE_ETIQUETA } from "@/shared/components/Campo";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { FiltroPeriodo } from "./Historial";
import type { Curso, Periodo, PlanillaAsistencia } from "./types";

type Participacion = PlanillaAsistencia["participaciones"][number];

const diaSemana = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "").slice(0, 2);
const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" });
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

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

// Las marcas del libro de asistencia: P, T (llegó tarde, cuenta como
// presente) y A. Las otras infracciones van como un punto en la marca.
type Marca = "P" | "T" | "A";

function marcaDe(p: Participacion | undefined): Marca {
  if (!p) return "A";
  return p.motivos.some((m) => m.startsWith("Llegó")) ? "T" : "P";
}

const otrasInfracciones = (p: Participacion | undefined) =>
  (p?.motivos ?? []).filter((m) => !m.startsWith("Llegó"));

const ESTILO_MARCA: Record<Marca, string> = {
  P: "bg-verde/[0.08] text-verde",
  T: "bg-alerta/35 text-carbon",
  A: "bg-error/10 text-error",
};

const LEYENDA: [Marca | "•", string][] = [
  ["P", "Presente"],
  ["T", "Llegó tarde"],
  ["A", "No se conectó"],
  ["•", "Otra infracción (ausente digital, se fue antes, sin red, distracciones)"],
];

// Mes actual en hora local, "AAAA-MM" (lo que usa <input type="month">).
function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

// La planilla completa de un mes (una columna por clase) para Excel.
function ExportarMes({ cursoId }: { cursoId: number }) {
  const [mes, setMes] = useState(mesActual);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState(false);

  async function descargar(): Promise<void> {
    const [anio, m] = mes.split("-").map(Number);
    const ultimoDia = new Date(anio, m, 0).getDate();
    setDescargando(true);
    setError(false);
    try {
      const res = await api.get<Blob>("/asistencia", {
        params: { cursoId, desde: `${mes}-01`, hasta: `${mes}-${ultimoDia}`, formato: "csv" },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asistencia-${mes}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <span className={CLASE_ETIQUETA}>Exportar un mes a Excel</span>
      <div className="flex gap-2">
        <input
          type="month"
          aria-label="Mes a exportar"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className={`${CLASE_CONTROL} min-w-0`}
        />
        <Boton variante="sutil" cargando={descargando} disabled={!mes} onClick={() => void descargar()} className="shrink-0">
          <Icono nombre="descargar" className="size-4" />
          CSV
        </Boton>
      </div>
      {error && <MensajeEstado tipo="error">No se pudo exportar. Probá de nuevo.</MensajeEstado>}
    </div>
  );
}

// Cursos como botones mientras entren cómodos; con muchos, un select.
function ElegirCurso({ cursos, valor, onChange }: { cursos: Curso[]; valor: string; onChange: (id: string) => void }) {
  if (cursos.length > 6) {
    return (
      <label className="block space-y-1.5">
        <span className={CLASE_ETIQUETA}>Curso</span>
        <select value={valor} onChange={(e) => onChange(e.target.value)} className={CLASE_CONTROL}>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} · {c.anioLectivo}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div role="radiogroup" aria-label="Curso" className="flex flex-wrap gap-2">
      {cursos.map((c) => {
        const activo = String(c.id) === valor;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(String(c.id))}
            className={`min-h-11 rounded-2xl px-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon ${
              activo ? "pizarron text-arena" : "border border-carbon/10 bg-white text-carbon hover:border-carbon/25"
            }`}
          >
            <span className="font-display text-base font-bold">{c.nombre}</span>
            <span className={`ml-2 text-xs ${activo ? "text-arena/70" : "text-carbon/55"}`}>
              {c.anioLectivo}
              {c.turno ? ` · ${c.turno}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Resumen({ d }: { d: PlanillaAsistencia }) {
  const matriculados = d.alumnos.filter((a) => a.matriculado);
  const posibles = matriculados.length * d.clases.length;
  const presentes = d.participaciones.filter((p) => matriculados.some((a) => a.id === p.alumnoId)).length;
  const porcentaje = posibles ? Math.round((presentes / posibles) * 100) : 0;
  const tardes = d.participaciones.filter((p) => marcaDe(p) === "T").length;
  const conInfraccion = d.participaciones.filter((p) => otrasInfracciones(p).length > 0).length;
  const datos: [string, string][] = [
    ["Clases", String(d.clases.length)],
    ["Asistencia", `${porcentaje} %`],
    ["Llegadas tarde", String(tardes)],
    ["Otras infracciones", String(conInfraccion)],
  ];
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-3xl border border-carbon/[0.07] bg-white shadow-tarjeta sm:grid-cols-4">
      {datos.map(([etiqueta, valor], i) => (
        <div
          key={etiqueta}
          className={`px-5 py-4 ${i > 0 ? "sm:border-l" : ""} ${i % 2 === 1 ? "border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""} border-carbon/[0.07]`}
        >
          <dt className="text-xs font-medium text-carbon/60">{etiqueta}</dt>
          <dd className="mt-1 font-display text-3xl font-bold text-carbon tabular-nums">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetalleCelda({
  alumno,
  clase,
  participacion,
  onCerrar,
}: {
  alumno: PlanillaAsistencia["alumnos"][number];
  clase: PlanillaAsistencia["clases"][number];
  participacion: Participacion | undefined;
  onCerrar: () => void;
}) {
  const marca = marcaDe(participacion);
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-papel px-4 py-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl font-mono text-lg font-bold ${ESTILO_MARCA[marca]}`}>
        {marca}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm text-carbon">
          <span className="font-semibold">
            {alumno.nombre} {alumno.apellido}
          </span>
          <span className="text-carbon/60">
            {" "}
            · {fechaHora(clase.iniciadaAt)} · {clase.docente}
          </span>
        </p>
        {!participacion ? (
          <p className="text-sm text-carbon/75">No se conectó a esta clase.</p>
        ) : participacion.motivos.length === 0 ? (
          <p className="text-sm text-carbon/75">
            Entró a horario y se quedó conectado toda la clase.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {participacion.motivos.map((m) => (
              <Badge key={m} variante={m.startsWith("Llegó") ? "amarillo" : "ambar"}>
                {m}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Cerrar detalle"
        onClick={onCerrar}
        className="grid size-9 shrink-0 place-items-center rounded-full text-carbon/50 hover:bg-carbon/[0.06] hover:text-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
      >
        <Icono nombre="mas" className="size-4 rotate-45" />
      </button>
    </div>
  );
}

/**
 * Planilla de asistencia por clase, como el libro de preceptoría: cada
 * alumno contra cada clase con P / T / A, más un punto si infringió la
 * norma de estar conectado de otra forma. La usan docente, preceptor y
 * dirección (el backend recorta qué clases ve cada uno).
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

  if (cursos.length === 0) {
    return (
      <Tarjeta>
        <MensajeEstado tipo="vacio">
          Todavía no tenés cursos. Cuando te asignen uno, acá vas a ver su asistencia clase por clase.
        </MensajeEstado>
      </Tarjeta>
    );
  }

  return (
    <div className="space-y-5">
      <Tarjeta className="space-y-5">
        <ElegirCurso
          cursos={cursos}
          valor={cursoId}
          onChange={(id) => {
            setCursoId(id);
            setCelda(null);
          }}
        />
        <div className="grid gap-4 border-t border-carbon/[0.07] pt-5 md:grid-cols-[2fr_1fr]">
          <FiltroPeriodo valor={periodo} onChange={setPeriodo} />
          {cursoId && <ExportarMes cursoId={Number(cursoId)} />}
        </div>
      </Tarjeta>

      {planilla.isPending ? (
        <MensajeEstado tipo="cargando">Cargando asistencia...</MensajeEstado>
      ) : planilla.isError ? (
        <MensajeEstado tipo="error">No se pudo cargar la asistencia. Recargá la página.</MensajeEstado>
      ) : d!.alumnos.length === 0 ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">Este curso no tiene alumnos. Cargalos desde la gestión de cursos.</MensajeEstado>
        </Tarjeta>
      ) : d!.clases.length === 0 ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">No hubo clases de este curso en esas fechas. Probá ampliando el período.</MensajeEstado>
        </Tarjeta>
      ) : (
        <>
          <Resumen d={d!} />

          <Tarjeta className="space-y-4 p-0 sm:p-0">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 px-5 pt-5 text-xs text-carbon/70 sm:px-6">
              {LEYENDA.map(([marca, texto]) => (
                <li key={marca} className="inline-flex items-center gap-2">
                  {marca === "•" ? (
                    <span className="grid size-6 place-items-center">
                      <span className="size-2 rounded-full bg-violeta" />
                    </span>
                  ) : (
                    <span className={`grid size-6 place-items-center rounded-md font-mono text-xs font-bold ${ESTILO_MARCA[marca]}`}>
                      {marca}
                    </span>
                  )}
                  {texto}
                </li>
              ))}
            </ul>

            <div className="overflow-x-auto pb-2">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-xs text-carbon/55">
                    <th scope="col" className="sticky left-0 z-10 w-12 min-w-12 bg-white py-2 pr-1 pl-5 text-left font-medium">
                      N°
                    </th>
                    <th scope="col" className="sticky left-12 z-10 bg-white py-2 pr-4 text-left font-medium">
                      Alumno
                    </th>
                    {d!.clases.map((c) => (
                      <th key={c.id} scope="col" title={`${fechaHora(c.iniciadaAt)} · ${c.docente}`} className="px-1 py-2 text-center font-medium">
                        <span className="block capitalize">{diaSemana(c.iniciadaAt)}</span>
                        <span className="block font-mono text-[11px] text-carbon/70 tabular-nums">{fechaCorta(c.iniciadaAt)}</span>
                        {c.activa && <span className="mx-auto mt-0.5 block size-1.5 rounded-full bg-verde latido" title="Clase en vivo" />}
                      </th>
                    ))}
                    <th scope="col" className="py-2 pr-5 pl-3 text-right font-medium sm:pr-6">
                      Asistencia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d!.alumnos.map((a, i) => {
                    const presentes = d!.participaciones.filter((p) => p.alumnoId === a.id).length;
                    const porcentaje = Math.round((presentes / d!.clases.length) * 100);
                    const abierta = celda?.alumnoId === a.id;
                    return (
                      <Fragment key={a.id}>
                        <tr className="group">
                          <td className="sticky left-0 z-10 w-12 min-w-12 border-t border-carbon/[0.06] bg-white py-1.5 pr-1 pl-5 font-mono text-xs text-carbon/45 tabular-nums group-hover:bg-papel">
                            {a.matriculado ? i + 1 : "—"}
                          </td>
                          <th
                            scope="row"
                            className="sticky left-12 z-10 max-w-48 border-t border-carbon/[0.06] bg-white py-1.5 pr-4 text-left font-medium text-carbon group-hover:bg-papel"
                          >
                            <span className="block truncate">
                              {a.apellido}, {a.nombre}
                            </span>
                            {!a.matriculado && <span className="block text-[11px] font-normal text-carbon/55">No está matriculado</span>}
                          </th>
                          {d!.clases.map((c) => {
                            const p = participacion(a.id, c.id);
                            const marca = marcaDe(p);
                            const otras = otrasInfracciones(p).length > 0;
                            const activa = abierta && celda.sesionId === c.id;
                            return (
                              <td key={c.id} className="border-t border-carbon/[0.06] px-1 py-1.5 text-center group-hover:bg-papel/60">
                                <button
                                  type="button"
                                  aria-label={`${a.apellido} ${a.nombre}, ${fechaCorta(c.iniciadaAt)}: ${
                                    LEYENDA.find(([m]) => m === marca)![1]
                                  }${otras ? ", con otra infracción" : ""}`}
                                  aria-expanded={activa}
                                  onClick={() => setCelda(activa ? null : { alumnoId: a.id, sesionId: c.id })}
                                  className={`relative mx-auto grid size-9 place-items-center rounded-lg font-mono text-sm font-bold transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon ${
                                    ESTILO_MARCA[marca]
                                  } ${activa ? "ring-2 ring-carbon ring-offset-1" : ""}`}
                                >
                                  {marca}
                                  {otras && (
                                    <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-violeta" />
                                  )}
                                </button>
                              </td>
                            );
                          })}
                          <td className="border-t border-carbon/[0.06] py-1.5 pr-5 pl-3 group-hover:bg-papel/60 sm:pr-6">
                            <span className="ml-auto flex w-24 items-center gap-2">
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-carbon/[0.07]" aria-hidden="true">
                                <span className="block h-full rounded-full bg-verde" style={{ width: `${porcentaje}%` }} />
                              </span>
                              <span className="w-9 text-right font-mono text-xs text-carbon/75 tabular-nums">{porcentaje}%</span>
                            </span>
                          </td>
                        </tr>
                        {abierta && (
                          <tr>
                            <td colSpan={d!.clases.length + 3} className="px-3 pb-3 sm:px-4">
                              <DetalleCelda
                                alumno={a}
                                clase={d!.clases.find((c) => c.id === celda.sesionId)!}
                                participacion={participacion(a.id, celda.sesionId)}
                                onCerrar={() => setCelda(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        </>
      )}
    </div>
  );
}
