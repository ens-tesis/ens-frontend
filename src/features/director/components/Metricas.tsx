"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FiltroPeriodo, type FilaMetricas, type Periodo } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { Boton } from "@/shared/components/Boton";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Pestanas } from "@/shared/components/Pestanas";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";
import { formatoDuracion } from "@/shared/lib/presencia";

type Agrupar = "curso" | "docente";

const valor = (f: FilaMetricas, k: keyof FilaMetricas) =>
  k === "segundosFueraDeFoco" ? formatoDuracion(f[k]) : f[k];

const COLUMNAS: [keyof FilaMetricas, string][] = [
  ["sesiones", "Sesiones"],
  ["alumnosUnicos", "Alumnos únicos"],
  ["participaciones", "Participaciones"],
  ["distracciones", "Distracciones"],
  ["segundosFueraDeFoco", "Tiempo fuera de foco"],
  ["ausenciasDigitales", "Ausencias digitales"],
  ["cortesDeRed", "Cortes de red"],
  ["desconexionesPorRed", "Desconexiones por red"],
];

function params(agrupar: Agrupar, periodo: Periodo, formato?: "csv") {
  return {
    agrupar,
    ...(periodo.desde && { desde: periodo.desde }),
    ...(periodo.hasta && { hasta: periodo.hasta }),
    ...(formato && { formato }),
  };
}

// Proporción de una fila contra el máximo de la columna: barra chica para
// leer el ranking de un vistazo sin un gráfico aparte.
function Barra({ valor, max }: { valor: number; max: number }) {
  return (
    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-carbon/[0.06]" aria-hidden="true">
      <span className="block h-full rounded-full bg-verde" style={{ width: `${max ? (valor / max) * 100 : 0}%` }} />
    </span>
  );
}

// Dashboard agregado del director (US-DI-01), exportable a CSV.
export function Metricas() {
  const [agrupar, setAgrupar] = useState<Agrupar>("curso");
  const [periodo, setPeriodo] = useState<Periodo>({ desde: "", hasta: "" });
  const [descargando, setDescargando] = useState(false);

  const metricas = useQuery({
    queryKey: ["reportes", "metricas", agrupar, periodo],
    queryFn: () =>
      api
        .get<{ filas: FilaMetricas[] }>("/reportes/metricas", { params: params(agrupar, periodo) })
        .then((r) => r.data.filas),
  });

  async function descargarCsv(): Promise<void> {
    setDescargando(true);
    try {
      const res = await api.get<Blob>("/reportes/metricas", {
        params: params(agrupar, periodo, "csv"),
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `metricas-ens-por-${agrupar}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDescargando(false);
    }
  }

  const filas = metricas.data ?? [];
  const suma = (k: keyof FilaMetricas) => filas.reduce((acc, f) => acc + Number(f[k]), 0);
  const maxSesiones = Math.max(0, ...filas.map((f) => f.sesiones));
  const totales = [
    { etiqueta: "Sesiones", valor: suma("sesiones"), clase: "pizarron text-arena" },
    { etiqueta: "Distracciones", valor: suma("distracciones"), clase: "bg-violeta text-carbon" },
    { etiqueta: "Ausencias digitales", valor: suma("ausenciasDigitales"), clase: "bg-celeste text-carbon" },
    { etiqueta: "Cortes de red", valor: suma("cortesDeRed"), clase: "bg-white text-carbon border border-carbon/[0.07]" },
  ];

  return (
    <div className="space-y-6">
      <Tarjeta className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="sm:w-64">
            <Pestanas
              etiqueta="Agrupar por"
              opciones={[
                { id: "curso", etiqueta: "Por curso" },
                { id: "docente", etiqueta: "Por docente" },
              ]}
              activa={agrupar}
              onCambiar={setAgrupar}
            />
          </div>
          <div className="flex-1">
            <FiltroPeriodo valor={periodo} onChange={setPeriodo} />
          </div>
          <Boton variante="sutil" cargando={descargando} onClick={() => void descargarCsv()}>
            <Icono nombre="descargar" className="size-4" />
            Exportar CSV
          </Boton>
        </div>
      </Tarjeta>

      {metricas.isPending ? (
        <MensajeEstado tipo="cargando">Cargando métricas...</MensajeEstado>
      ) : metricas.isError ? (
        <MensajeEstado tipo="error">No se pudieron cargar las métricas.</MensajeEstado>
      ) : filas.length === 0 ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">No hubo clases en ese período. Probá ampliando las fechas.</MensajeEstado>
        </Tarjeta>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {totales.map((t) => (
              <div key={t.etiqueta} className={`rounded-3xl p-4 sm:p-5 ${t.clase}`}>
                <dt className="text-xs font-semibold opacity-75">{t.etiqueta}</dt>
                <dd className="mt-3 font-display text-4xl font-bold tabular-nums sm:text-5xl">{t.valor}</dd>
              </div>
            ))}
          </dl>

          {/* Mobile: una tarjeta por grupo. Desktop: tabla completa. */}
          <ul className="space-y-2 md:hidden">
            {filas.map((f) => (
              <li key={f.grupo} className={`${CLASE_FILA} bg-white p-4`}>
                <p className="font-semibold text-carbon">{f.grupo}</p>
                <Barra valor={f.sesiones} max={maxSesiones} />
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {COLUMNAS.slice(0, 6).map(([k, t]) => (
                    <div key={k}>
                      <dd className="font-display text-xl font-bold tabular-nums text-carbon">{valor(f, k)}</dd>
                      <dt className="text-[11px] leading-tight text-carbon/60">{t}</dt>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>

          <Tarjeta className="hidden overflow-x-auto p-0 sm:p-0 md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-carbon/60">
                <tr className="border-b border-carbon/[0.07]">
                  <th className="px-5 py-3.5 font-semibold">{agrupar === "curso" ? "Curso" : "Docente"}</th>
                  {COLUMNAS.map(([k, t]) => (
                    <th key={k} className="px-3 py-3.5 text-right font-semibold">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-carbon/[0.06]">
                {filas.map((f) => (
                  <tr key={f.grupo} className="hover:bg-papel/60">
                    <td className="px-5 py-3 font-semibold text-carbon">
                      {f.grupo}
                      <Barra valor={f.sesiones} max={maxSesiones} />
                    </td>
                    {COLUMNAS.map(([k]) => (
                      <td key={k} className="px-3 py-3 text-right tabular-nums text-carbon">
                        {valor(f, k)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Tarjeta>
        </>
      )}
    </div>
  );
}
