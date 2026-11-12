"use client";

import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/shared/components/Badge";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { useAsistenciaClase } from "../hooks/useAsistencia";
import { marcaClase, type Marca, type MarcaDia } from "../lib/marcas";
import type { AlumnoAsistencia, AsistenciaDeClase, Participacion } from "../types";

export const ESTILO_MARCA: Record<MarcaDia, string> = {
  P: "bg-verde/[0.08] text-verde",
  T: "bg-alerta/35 text-carbon",
  PA: "bg-alerta/70 text-carbon",
  A: "bg-error/10 text-error",
};

// La celda P / T / PA / A, con * si se desconectó antes del final.
export function CeldaMarca({ m, className = "" }: { m: Marca<MarcaDia>; className?: string }) {
  return (
    <span className={`relative grid place-items-center rounded-lg font-mono font-bold ${ESTILO_MARCA[m.marca]} ${className}`}>
      {m.marca}
      {m.salio && (
        <span aria-hidden="true" className="absolute -top-1 -right-0.5 text-base leading-none text-error">
          *
        </span>
      )}
    </span>
  );
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

// Qué más pasó, a partir de los conteos (no de los textos del CSV).
function observaciones(p: Participacion, umbral: number): string[] {
  const o: string[] = [];
  if (p.salidasAntesDelFinal > 0) o.push(`Se fue antes del final${p.salidasAntesDelFinal > 1 ? ` ×${p.salidasAntesDelFinal}` : ""}`);
  if (p.ausenciasDigitales > 0) o.push(`Ausente digital ×${p.ausenciasDigitales}`);
  if (p.cortesDeRed > 0) o.push(`Sin red ×${p.cortesDeRed}`);
  if (p.distracciones > umbral) o.push(`${p.distracciones} distracciones`);
  return o;
}

function Fila({ a, p, umbral }: { a: AlumnoAsistencia; p: Participacion | undefined; umbral: number }) {
  const m = marcaClase(p);
  return (
    <li className="flex items-center gap-4 px-5 py-2.5 sm:px-6">
      <CeldaMarca m={m} className="size-9 shrink-0 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-carbon">
          {a.apellido}, {a.nombre}
          {!a.matriculado && <span className="ml-2 text-xs font-normal text-carbon/55">no matriculado</span>}
        </p>
        {p && observaciones(p, umbral).length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1">
            {observaciones(p, umbral).map((o) => (
              <Badge key={o} variante="ambar">
                {o}
              </Badge>
            ))}
          </p>
        )}
      </div>
      <span className="shrink-0 text-xs text-carbon/60 tabular-nums">
        {!p ? "No se conectó" : p.tarde ? `+${p.minutosDesdeInicio} min` : "A horario"}
      </span>
    </li>
  );
}

function Resumen({ d }: { d: AsistenciaDeClase }) {
  const matriculados = d.alumnos.filter((a) => a.matriculado);
  const de = (alumnoId: number) => d.participaciones.find((p) => p.alumnoId === alumnoId);
  const presentes = matriculados.filter((a) => de(a.id)).length;
  const tarde = matriculados.filter((a) => de(a.id)?.tarde).length;
  const datos: [string, number][] = [
    ["Presentes", presentes],
    ["Llegaron tarde", tarde],
    ["Ausentes", matriculados.length - presentes],
  ];
  return (
    <dl className="grid grid-cols-3 overflow-hidden rounded-3xl border border-carbon/[0.07] bg-white shadow-tarjeta">
      {datos.map(([etiqueta, valor], i) => (
        <div key={etiqueta} className={`px-5 py-4 ${i > 0 ? "border-l border-carbon/[0.07]" : ""}`}>
          <dt className="text-xs font-medium text-carbon/60">{etiqueta}</dt>
          <dd className="mt-1 font-display text-3xl font-bold text-carbon tabular-nums">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * La asistencia de una clase: todos los matriculados del curso con P / T / A
 * para esa clase. La misma pantalla para docente, preceptor y dirección.
 */
export function AsistenciaClase({ codigo, volver }: { codigo: string; volver?: Route }) {
  const q = useAsistenciaClase(codigo);

  if (q.isPending) return <MensajeEstado tipo="cargando">Cargando asistencia...</MensajeEstado>;
  if (q.isError) return <MensajeEstado tipo="error">No se encontró esa clase o no tenés acceso.</MensajeEstado>;
  const d = q.data;
  const { clase } = d;
  const de = (alumnoId: number) => d.participaciones.find((p) => p.alumnoId === alumnoId);
  const matriculados = d.alumnos.filter((a) => a.matriculado);
  const colados = d.alumnos.filter((a) => !a.matriculado);

  return (
    <div className="entrar space-y-5">
      {volver && (
        <Link href={volver} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-carbon/70 hover:text-carbon">
          <Icono nombre="volver" className="size-4" />
          Volver
        </Link>
      )}
      <Tarjeta className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.12em] text-carbon/50 uppercase">
            {clase.curso ?? "Clase sin curso"} · {clase.codigo}
          </p>
          <h2 className="font-display text-2xl font-bold text-carbon capitalize">{fechaLarga(clase.iniciadaAt)}</h2>
          <p className="text-sm text-carbon/65">
            {hora(clase.iniciadaAt)}
            {clase.finalizadaAt ? ` a ${hora(clase.finalizadaAt)}` : ""} · {clase.docente}
          </p>
        </div>
        <Badge variante={clase.activa ? "verde" : "celeste"} punto={clase.activa ? "vivo" : false}>
          {clase.activa ? "En vivo" : "Finalizada"}
        </Badge>
      </Tarjeta>

      {matriculados.length === 0 && colados.length === 0 ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">Este curso no tiene alumnos matriculados y nadie entró a la clase.</MensajeEstado>
        </Tarjeta>
      ) : (
        <>
          {matriculados.length > 0 && <Resumen d={d} />}
          <Tarjeta className="p-0 sm:p-0">
            <ul className="divide-y divide-carbon/[0.06] py-2">
              {matriculados.map((a) => (
                <Fila key={a.id} a={a} p={de(a.id)} umbral={d.umbralDistracciones} />
              ))}
            </ul>
            {colados.length > 0 && (
              <>
                <p className="border-t border-carbon/[0.07] px-5 pt-4 pb-1 text-[11px] font-semibold tracking-[0.14em] text-carbon/50 uppercase sm:px-6">
                  Entraron sin estar matriculados
                </p>
                <ul className="divide-y divide-carbon/[0.06] pb-2">
                  {colados.map((a) => (
                    <Fila key={a.id} a={a} p={de(a.id)} umbral={d.umbralDistracciones} />
                  ))}
                </ul>
              </>
            )}
          </Tarjeta>
        </>
      )}
    </div>
  );
}
