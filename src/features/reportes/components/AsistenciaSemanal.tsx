"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";
import { api } from "@/shared/api/client";
import { Boton } from "@/shared/components/Boton";
import { CLASE_CONTROL, CLASE_ETIQUETA } from "@/shared/components/Campo";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { useCursos, type Curso } from "@/features/cursos";
import { useAsistencia } from "../hooks/useAsistencia";
import { ETIQUETA_MARCA, marcaClase, marcaDia, textoMarca, type MarcaDia } from "../lib/marcas";
import type { AlumnoAsistencia, ClaseAsistencia, PlanillaAsistencia } from "../types";
import { CeldaMarca, ESTILO_MARCA } from "./AsistenciaClase";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie"];

// Fechas en hora local (la del colegio), sin librerías.
function lunesDe(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function sumarDias(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mismoDia = (a: Date, b: Date) => iso(a) === iso(b);
const diaMes = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "");
const hora = (s: string) => new Date(s).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

// Mes actual en hora local, "AAAA-MM" (lo que usa <input type="month">).
function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}`;
}

// La planilla completa de un mes (una columna por clase) para Excel.
function ExportarMes({ cursoId }: { cursoId: number }) {
  const [mes, setMes] = useState(mesActual);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState(false);

  async function descargar(): Promise<void> {
    const [anio, m] = mes.split("-").map(Number);
    const ultimoDia = new Date(anio!, m!, 0).getDate();
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
        <input type="month" aria-label="Mes a exportar" value={mes} onChange={(e) => setMes(e.target.value)} className={`${CLASE_CONTROL} min-w-0`} />
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

const CLASE_NAV =
  "grid size-10 place-items-center rounded-full border border-carbon/10 bg-white text-carbon hover:border-carbon/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon";

// Las clases de un día para un alumno, con el link a cada una.
function DetalleDia({
  alumno,
  clases,
  d,
  base,
  onCerrar,
}: {
  alumno: AlumnoAsistencia;
  clases: ClaseAsistencia[];
  d: PlanillaAsistencia;
  base: string;
  onCerrar: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-papel px-4 py-3">
      <ul className="min-w-0 flex-1 space-y-1.5">
        <li className="text-sm font-semibold text-carbon">
          {alumno.nombre} {alumno.apellido}
        </li>
        {clases.map((c) => {
          const m = marcaClase(d.participaciones.find((p) => p.alumnoId === alumno.id && p.sesionId === c.id));
          return (
            <li key={c.id} className="flex items-center gap-3 text-sm text-carbon/80">
              <CeldaMarca m={m} className="size-7 text-xs" />
              <span className="tabular-nums">{hora(c.iniciadaAt)}</span>
              <span className="min-w-0 flex-1 truncate">{c.docente}</span>
              <Link href={`/${base}/asistencia/${c.codigo}` as Route} className="shrink-0 font-semibold text-carbon/70 hover:text-carbon">
                Ver clase
              </Link>
            </li>
          );
        })}
      </ul>
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
 * Asistencia de un curso por semana, de lunes a viernes, como el libro de
 * preceptoría: una marca por alumno y día que resume todas las clases de
 * ese día. Al tocar una celda se ven las clases y se entra a cada una.
 */
export function AsistenciaSemanal() {
  const base = usePathname().split("/")[1] ?? "preceptor";
  const cursosQuery = useCursos();
  const cursos = cursosQuery.data ?? [];
  const [elegido, setCursoId] = useState("");
  const cursoId = elegido || (cursos[0] ? String(cursos[0].id) : "");
  const [lunes, setLunes] = useState(() => lunesDe(new Date()));
  const [celda, setCelda] = useState<{ alumnoId: number; dia: number } | null>(null);
  const viernes = sumarDias(lunes, 4);
  const planilla = useAsistencia(cursoId ? Number(cursoId) : null, { desde: iso(lunes), hasta: iso(viernes) });
  const d = planilla.data;

  const dias = DIAS.map((_, i) => {
    const fecha = sumarDias(lunes, i);
    return { fecha, clases: (d?.clases ?? []).filter((c) => mismoDia(new Date(c.iniciadaAt), fecha)) };
  });
  const hayClases = dias.some((x) => x.clases.length > 0);
  const semanaActual = mismoDia(lunes, lunesDe(new Date()));

  function moverSemana(n: number): void {
    setLunes((l) => sumarDias(l, n * 7));
    setCelda(null);
  }

  if (cursosQuery.isPending) return <MensajeEstado tipo="cargando">Cargando cursos...</MensajeEstado>;
  if (cursos.length === 0) {
    return (
      <Tarjeta>
        <MensajeEstado tipo="vacio">Todavía no tenés cursos. Cuando te asignen uno, acá vas a ver su asistencia semana por semana.</MensajeEstado>
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
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Semana anterior" onClick={() => moverSemana(-1)} className={CLASE_NAV}>
              <Icono nombre="flecha" className="size-4 rotate-180" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-carbon">
                {diaMes(lunes)} – {diaMes(viernes)}
              </p>
              {!semanaActual && (
                <button type="button" onClick={() => { setLunes(lunesDe(new Date())); setCelda(null); }} className="text-xs font-semibold text-carbon/60 hover:text-carbon">
                  Volver a esta semana
                </button>
              )}
            </div>
            <button type="button" aria-label="Semana siguiente" onClick={() => moverSemana(1)} className={CLASE_NAV}>
              <Icono nombre="flecha" className="size-4" />
            </button>
          </div>
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
      ) : !hayClases ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">No hubo clases de este curso esa semana.</MensajeEstado>
        </Tarjeta>
      ) : (
        <Tarjeta className="space-y-4 p-0 sm:p-0">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 px-5 pt-5 text-xs text-carbon/70 sm:px-6">
            {(Object.keys(ETIQUETA_MARCA) as MarcaDia[]).map((m) => (
              <li key={m} className="inline-flex items-center gap-2">
                <span className={`grid h-6 min-w-6 place-items-center rounded-md px-1 font-mono text-xs font-bold ${ESTILO_MARCA[m]}`}>{m}</span>
                {ETIQUETA_MARCA[m]}
              </li>
            ))}
            <li className="inline-flex items-center gap-2">
              <span className="grid h-6 min-w-6 place-items-center font-mono text-base font-bold text-error">*</span>
              Se desconectó antes del final
            </li>
          </ul>

          <div className="overflow-x-auto pb-2">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-xs text-carbon/55">
                  <th scope="col" className="sticky left-0 z-10 w-12 min-w-12 bg-white py-2 pr-1 pl-5 text-left font-medium">N°</th>
                  <th scope="col" className="sticky left-12 z-10 bg-white py-2 pr-4 text-left font-medium">Alumno</th>
                  {dias.map((x, i) => (
                    <th key={i} scope="col" className="px-1 py-2 text-center font-medium">
                      <span className="block">{DIAS[i]}</span>
                      <span className="block font-mono text-[11px] text-carbon/70 tabular-nums">{diaMes(x.fecha)}</span>
                      <span className="block text-[11px] text-carbon/50">
                        {x.clases.length === 0 ? "—" : x.clases.length === 1 ? "1 clase" : `${x.clases.length} clases`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d!.alumnos.map((a, i) => {
                  const abierta = celda?.alumnoId === a.id;
                  return (
                    <Fragment key={a.id}>
                      <tr className="group">
                        <td className="sticky left-0 z-10 w-12 min-w-12 border-t border-carbon/[0.06] bg-white py-1.5 pr-1 pl-5 font-mono text-xs text-carbon/45 tabular-nums group-hover:bg-papel">
                          {a.matriculado ? i + 1 : "—"}
                        </td>
                        <th scope="row" className="sticky left-12 z-10 max-w-48 border-t border-carbon/[0.06] bg-white py-1.5 pr-4 text-left font-medium text-carbon group-hover:bg-papel">
                          <span className="block truncate">
                            {a.apellido}, {a.nombre}
                          </span>
                          {!a.matriculado && <span className="block text-[11px] font-normal text-carbon/55">No está matriculado</span>}
                        </th>
                        {dias.map((x, dia) => {
                          const ids = x.clases.map((c) => c.id);
                          const m = marcaDia(ids.length, d!.participaciones.filter((p) => p.alumnoId === a.id && ids.includes(p.sesionId)));
                          const activa = abierta && celda.dia === dia;
                          return (
                            <td key={dia} className="border-t border-carbon/[0.06] px-1 py-1.5 text-center group-hover:bg-papel/60">
                              {m ? (
                                <button
                                  type="button"
                                  aria-label={`${a.apellido} ${a.nombre}, ${DIAS[dia]} ${diaMes(x.fecha)}: ${textoMarca(m)}`}
                                  aria-expanded={activa}
                                  onClick={() => setCelda(activa ? null : { alumnoId: a.id, dia })}
                                  className={`mx-auto block rounded-lg transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon ${activa ? "ring-2 ring-carbon ring-offset-1" : ""}`}
                                >
                                  <CeldaMarca m={m} className="h-9 min-w-9 px-1.5 text-sm" />
                                </button>
                              ) : (
                                <span className="text-carbon/30">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {abierta && (
                        <tr>
                          <td colSpan={DIAS.length + 2} className="px-3 pb-3 sm:px-4">
                            <DetalleDia alumno={a} clases={dias[celda.dia]!.clases} d={d!} base={base} onCerrar={() => setCelda(null)} />
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
      )}
    </div>
  );
}
