"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { FiltroPeriodo, paramsDePeriodo, PERIODO_VACIO, type Periodo } from "@/shared/components/FiltroPeriodo";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Pestanas } from "@/shared/components/Pestanas";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";

interface Estadisticas {
  muestras: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  max: number | null;
  dentroObjetivo: number | null;
}

interface LatenciaPorClase extends Estadisticas {
  codigo: string | null;
  fecha: string;
  curso: string | null;
  docente: string | null;
  alumnos: number;
}

interface HttpLenta {
  fecha: string;
  ms: number;
  detalle: { metodo?: string; ruta?: string; status?: number };
}

interface RespuestaLatencia {
  objetivoMs: number;
  total: Estadisticas;
  porClase: LatenciaPorClase[];
  httpLentas: HttpLenta[];
}

interface ErrorRegistrado {
  id: number;
  fecha: string;
  origen: "backend" | "frontend";
  mensaje: string;
  stack: string | null;
  ruta: string | null;
  usuario: string | null;
  detalle: Record<string, unknown>;
}

interface AccionAuditada {
  id: number;
  fecha: string;
  actor: string | null;
  accion: string;
  entidad: string;
  entidadId: number | null;
  detalle: Record<string, unknown> | null;
}

type Vista = "latencia" | "errores" | "acciones";

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "medium", hour12: false });
const ms = (v: number | null) => (v === null ? "—" : `${v} ms`);

// Sección Auditoría del admin: latencia de la whitelist (objetivo ≤500 ms),
// errores de backend y navegadores, y acciones administrativas.
export function Auditoria() {
  const [vista, setVista] = useState<Vista>("latencia");
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_VACIO);

  return (
    <div className="space-y-6">
      <Tarjeta className="space-y-4">
        <Pestanas
          etiqueta="Qué auditar"
          opciones={[
            { id: "latencia", etiqueta: "Latencia" },
            { id: "errores", etiqueta: "Errores" },
            { id: "acciones", etiqueta: "Acciones" },
          ]}
          activa={vista}
          onCambiar={setVista}
        />
        <FiltroPeriodo valor={periodo} onChange={setPeriodo} />
      </Tarjeta>
      {vista === "latencia" && <Latencia periodo={periodo} />}
      {vista === "errores" && <Errores periodo={periodo} />}
      {vista === "acciones" && <Acciones periodo={periodo} />}
    </div>
  );
}

function Estado({ q, vacio, children }: { q: { isPending: boolean; isError: boolean }; vacio: boolean; children: ReactNode }) {
  if (q.isPending) return <MensajeEstado tipo="cargando">Cargando...</MensajeEstado>;
  if (q.isError) return <MensajeEstado tipo="error">No se pudo cargar. Recargá la página.</MensajeEstado>;
  if (vacio)
    return (
      <Tarjeta>
        <MensajeEstado tipo="vacio">No hay registros en ese período.</MensajeEstado>
      </Tarjeta>
    );
  return <>{children}</>;
}

function Latencia({ periodo }: { periodo: Periodo }) {
  const [descargando, setDescargando] = useState(false);
  const q = useQuery({
    queryKey: ["auditoria", "latencia", periodo],
    queryFn: () =>
      api.get<RespuestaLatencia>("/auditoria/latencia", { params: paramsDePeriodo(periodo) }).then((r) => r.data),
  });

  async function descargarCsv(): Promise<void> {
    setDescargando(true);
    try {
      const res = await api.get<Blob>("/auditoria/latencia", {
        params: { ...paramsDePeriodo(periodo), formato: "csv" },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "latencia-whitelist-ens.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDescargando(false);
    }
  }

  const d = q.data;
  const cumple = d && d.total.p95 !== null && d.total.p95 <= d.objetivoMs;

  return (
    <Estado q={q} vacio={!!d && d.total.muestras === 0 && d.httpLentas.length === 0}>
      {d && (
        <div className="space-y-6">
          <Tarjeta className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-carbon">Propagación de la whitelist</h2>
                <p className="text-sm text-carbon/70">
                  Ida y vuelta servidor → alumno → servidor de cada cambio (la ida sola es menor). Objetivo: ≤
                  {d.objetivoMs} ms.
                </p>
              </div>
              {d.total.muestras > 0 && (
                <Badge variante={cumple ? "verde" : "rojo"}>{cumple ? "p95 dentro del objetivo" : "p95 fuera del objetivo"}</Badge>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  ["Muestras", String(d.total.muestras)],
                  ["Mediana", ms(d.total.p50)],
                  ["p95", ms(d.total.p95)],
                  ["p99", ms(d.total.p99)],
                  ["Máxima", ms(d.total.max)],
                  [`≤${d.objetivoMs} ms`, d.total.dentroObjetivo === null ? "—" : `${d.total.dentroObjetivo}%`],
                ] as const
              ).map(([etiqueta, valor]) => (
                <div key={etiqueta} className="rounded-2xl bg-papel px-3 py-2">
                  <dt className="text-xs text-carbon/60">{etiqueta}</dt>
                  <dd className="font-display text-2xl font-bold text-carbon tabular-nums">{valor}</dd>
                </div>
              ))}
            </dl>
            <Boton variante="sutil" cargando={descargando} onClick={() => void descargarCsv()}>
              <Icono nombre="descargar" className="size-4" />
              Exportar muestras (CSV)
            </Boton>
          </Tarjeta>

          {d.porClase.length > 0 && (
            <Tarjeta className="space-y-3">
              <h2 className="font-display text-xl font-bold text-carbon">Por clase</h2>
              <ul className="space-y-2">
                {d.porClase.map((c) => (
                  <li key={`${c.codigo}-${c.fecha}`} className={`${CLASE_FILA} p-3 text-sm`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold text-carbon">
                        {c.curso ?? "Sin curso"} · {c.codigo ?? "—"}
                      </span>
                      <span className="text-carbon/60">{fechaHora(c.fecha)}</span>
                    </div>
                    <p className="text-carbon/70">{c.docente ?? "Docente borrado"}</p>
                    <p className="mt-1 text-carbon tabular-nums">
                      {c.muestras} muestras · {c.alumnos} alumnos · p95 {ms(c.p95)} · máx {ms(c.max)} ·{" "}
                      {c.dentroObjetivo}% ≤{d.objetivoMs} ms
                    </p>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {d.httpLentas.length > 0 && (
            <Tarjeta className="space-y-3">
              <h2 className="font-display text-xl font-bold text-carbon">Pedidos HTTP lentos (más de 1 s)</h2>
              <ul className="space-y-2">
                {d.httpLentas.map((h, i) => (
                  <li key={i} className={`${CLASE_FILA} flex flex-wrap justify-between gap-2 p-3 text-sm`}>
                    <span className="min-w-0 break-all font-mono text-carbon">
                      {h.detalle.metodo} {h.detalle.ruta} → {h.detalle.status}
                    </span>
                    <span className="text-carbon/70 tabular-nums">
                      {h.ms} ms · {fechaHora(h.fecha)}
                    </span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </div>
      )}
    </Estado>
  );
}

function Errores({ periodo }: { periodo: Periodo }) {
  const [origen, setOrigen] = useState<"todos" | "backend" | "frontend">("todos");
  const q = useQuery({
    queryKey: ["auditoria", "errores", origen, periodo],
    queryFn: () =>
      api
        .get<{ errores: ErrorRegistrado[] }>("/auditoria/errores", {
          params: { ...paramsDePeriodo(periodo), ...(origen !== "todos" && { origen }) },
        })
        .then((r) => r.data.errores),
  });

  return (
    <div className="space-y-4">
      <Pestanas
        etiqueta="Origen"
        opciones={[
          { id: "todos", etiqueta: "Todos" },
          { id: "backend", etiqueta: "Backend" },
          { id: "frontend", etiqueta: "Navegadores" },
        ]}
        activa={origen}
        onCambiar={setOrigen}
      />
      <Estado q={q} vacio={q.data?.length === 0}>
        <ul className="space-y-2">
          {q.data?.map((e) => (
            <li key={e.id} className={`${CLASE_FILA} bg-white p-3 text-sm`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variante={e.origen === "backend" ? "ambar" : "celeste"}>
                  {e.origen === "backend" ? "Backend" : "Navegador"}
                </Badge>
                <span className="text-carbon/60">{fechaHora(e.fecha)}</span>
                {e.ruta && <span className="break-all font-mono text-carbon/70">{e.ruta}</span>}
                {e.usuario && <span className="text-carbon/70">{e.usuario}</span>}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer break-words font-medium text-carbon">
                  {e.mensaje.split("\n")[0]}
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-papel p-3 text-xs text-carbon/80">
                  {[e.mensaje, e.stack, Object.keys(e.detalle).length ? JSON.stringify(e.detalle, null, 2) : null]
                    .filter(Boolean)
                    .join("\n\n")}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      </Estado>
    </div>
  );
}

function Acciones({ periodo }: { periodo: Periodo }) {
  const q = useQuery({
    queryKey: ["auditoria", "acciones", periodo],
    queryFn: () =>
      api
        .get<{ acciones: AccionAuditada[] }>("/auditoria/acciones", { params: paramsDePeriodo(periodo) })
        .then((r) => r.data.acciones),
  });

  return (
    <Estado q={q} vacio={q.data?.length === 0}>
      <ul className="space-y-2">
        {q.data?.map((a) => (
          <li key={a.id} className={`${CLASE_FILA} bg-white p-3 text-sm`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold text-carbon">{a.accion.replaceAll("_", " ")}</span>
              <span className="text-carbon/60">{fechaHora(a.fecha)}</span>
            </div>
            <p className="text-carbon/70">
              {a.actor ?? "Usuario borrado"} · {a.entidad}
              {a.entidadId !== null && ` #${a.entidadId}`}
            </p>
            {a.detalle && Object.keys(a.detalle).length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-carbon/70">Detalle</summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-papel p-3 text-xs text-carbon/80">
                  {JSON.stringify(a.detalle, null, 2)}
                </pre>
              </details>
            )}
          </li>
        ))}
      </ul>
    </Estado>
  );
}
