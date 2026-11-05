"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FiltroPeriodo, type FilaMetricas, type Periodo } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { Boton } from "@/shared/components/Boton";
import { MensajeEstado } from "@/shared/components/MensajeEstado";

type Agrupar = "curso" | "docente";

const COLUMNAS: [keyof FilaMetricas, string][] = [
  ["sesiones", "Sesiones"],
  ["alumnosUnicos", "Alumnos únicos"],
  ["participaciones", "Participaciones"],
  ["distracciones", "Distracciones"],
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

  const totales = (metricas.data ?? []).reduce(
    (acc, f) => ({ sesiones: acc.sesiones + f.sesiones, distracciones: acc.distracciones + f.distracciones, cortes: acc.cortes + f.cortesDeRed }),
    { sesiones: 0, distracciones: 0, cortes: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-carbon">Métricas de uso</h2>
        <Boton variante="sutil" cargando={descargando} onClick={() => void descargarCsv()}>
          Exportar CSV
        </Boton>
      </div>

      <label className="block space-y-1.5 text-sm font-medium text-carbon">
        <span>Agrupar por</span>
        <select
          value={agrupar}
          onChange={(e) => setAgrupar(e.target.value as Agrupar)}
          className="min-h-11 w-full rounded-lg border border-carbon/20 bg-arena px-3.5 py-2.5 text-base text-carbon"
        >
          <option value="curso">Curso</option>
          <option value="docente">Docente</option>
        </select>
      </label>
      <FiltroPeriodo valor={periodo} onChange={setPeriodo} />

      {metricas.isPending ? (
        <MensajeEstado tipo="cargando">Cargando métricas...</MensajeEstado>
      ) : metricas.isError ? (
        <MensajeEstado tipo="error">No se pudieron cargar las métricas.</MensajeEstado>
      ) : metricas.data.length === 0 ? (
        <MensajeEstado tipo="vacio">No hay sesiones en ese período.</MensajeEstado>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Sesiones", totales.sesiones],
              ["Distracciones", totales.distracciones],
              ["Cortes de red", totales.cortes],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="rounded-lg border border-carbon/10 bg-arena p-3">
                <p className="text-xs text-carbon/70">{etiqueta}</p>
                <p className="text-2xl font-semibold tabular-nums text-carbon">{valor}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-carbon/10">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-carbon/5 text-left text-xs text-carbon/70">
                <tr>
                  <th className="px-3 py-2 font-medium">{agrupar === "curso" ? "Curso" : "Docente"}</th>
                  {COLUMNAS.map(([k, t]) => (
                    <th key={k} className="px-3 py-2 text-right font-medium">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-carbon/10 bg-arena">
                {metricas.data.map((f) => (
                  <tr key={f.grupo}>
                    <td className="px-3 py-2 font-medium text-carbon">{f.grupo}</td>
                    {COLUMNAS.map(([k]) => (
                      <td key={k} className="px-3 py-2 text-right tabular-nums text-carbon">
                        {f[k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
