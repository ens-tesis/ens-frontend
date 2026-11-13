"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { CLASE_CONTROL, CLASE_ETIQUETA } from "@/shared/components/Campo";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA_INTERACTIVA, Tarjeta } from "@/shared/components/Tarjeta";
import { Volver } from "@/shared/components/Volver";
import { mensajeDeError } from "@/shared/lib/errores";

type Veredicto = "bien" | "atencion" | "mal";

interface Resumen {
  veredicto: Veredicto;
  duracionMin: number;
  clases: number;
  alumnos: number;
  incidentes: number;
  latenciaP95: number | null;
  erroresServidor: number;
}

interface Seguimiento {
  id: number;
  institucionNombre: string;
  iniciadoPor: string | null;
  nota: string | null;
  incluirNombres: boolean;
  inicio: string;
  fin: string | null;
}

interface Respuesta {
  activo: (Seguimiento & { vivo: Resumen }) | null;
  historial: (Seguimiento & { resumen: Resumen | null })[];
}

const VEREDICTO: Record<Veredicto, { variante: "verde" | "amarillo" | "rojo"; texto: string }> = {
  bien: { variante: "verde", texto: "Todo bien" },
  atencion: { variante: "amarillo", texto: "Para mirar" },
  mal: { variante: "rojo", texto: "Con problemas" },
};

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", hour12: false });
const duracion = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`);

// Seguimiento de un colegio: mientras corre se registra todo lo que pasa;
// al finalizarlo queda un informe (como el del ensayo general) en el historial.
export function Seguimiento() {
  const [verInforme, setVerInforme] = useState<number | null>(null);
  const estado = useQuery({
    queryKey: ["seguimientos"],
    queryFn: () => api.get<Respuesta>("/seguimientos").then((r) => r.data),
    refetchInterval: (q) => (q.state.data?.activo ? 15_000 : false),
  });

  if (verInforme !== null) return <VisorInforme id={verInforme} onVolver={() => setVerInforme(null)} />;
  if (estado.isPending) return <MensajeEstado tipo="cargando">Cargando...</MensajeEstado>;
  if (estado.isError) return <MensajeEstado tipo="error">No se pudo cargar el seguimiento. Recargá la página.</MensajeEstado>;

  const { activo, historial } = estado.data;
  return (
    <div className="space-y-6">
      {activo ? <EnCurso seguimiento={activo} onInforme={setVerInforme} /> : <Iniciar />}
      <Tarjeta className="space-y-3">
        <h2 className="font-display text-xl font-bold text-carbon">Informes anteriores</h2>
        {historial.length === 0 ? (
          <MensajeEstado tipo="vacio">Todavía no hay informes. Iniciá un seguimiento y finalizalo para generar el primero.</MensajeEstado>
        ) : (
          <ul className="space-y-2">
            {historial.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setVerInforme(h.id)}
                  className={`${CLASE_FILA_INTERACTIVA} flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-3 text-left text-sm`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-carbon">
                      {h.institucionNombre} · {fechaHora(h.inicio)}
                    </span>
                    <span className="block text-carbon/65">
                      {h.resumen
                        ? `${duracion(h.resumen.duracionMin)} · ${h.resumen.clases} clases · ${h.resumen.alumnos} alumnos · ${h.resumen.incidentes} alertas`
                        : "Sin resumen"}
                      {h.nota ? ` · ${h.nota}` : ""}
                    </span>
                  </span>
                  {h.resumen && <Badge variante={VEREDICTO[h.resumen.veredicto].variante}>{VEREDICTO[h.resumen.veredicto].texto}</Badge>}
                  <Icono nombre="flecha" className="size-4 text-carbon/50" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

function Iniciar() {
  const queryClient = useQueryClient();
  const [colegio, setColegio] = useState("");
  const [nota, setNota] = useState("");
  const [incluirNombres, setIncluirNombres] = useState(false);
  const colegios = useQuery({
    queryKey: ["colegios", "lista-seguimiento"],
    queryFn: () => api.get<{ colegios: { id: number; nombre: string }[] }>("/instituciones").then((r) => r.data.colegios),
  });
  const iniciar = useMutation({
    mutationFn: () =>
      api.post("/seguimientos", { institucionId: Number(colegio), nota: nota.trim() || undefined, incluirNombres }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seguimientos"] }),
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    iniciar.mutate();
  }

  return (
    <Tarjeta className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-xl font-bold text-carbon">Iniciar un seguimiento</h2>
        <p className="text-sm text-carbon/70">
          Desde que lo iniciás se registra todo lo que pasa en el colegio elegido: clases, presencia, alertas, whitelist, errores y el
          rendimiento del servidor. Al finalizarlo se genera el informe. Si te olvidás, se cierra solo a las 12 horas.
        </p>
      </div>
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className={CLASE_ETIQUETA}>Colegio</span>
            <select id="seguimiento-colegio" required value={colegio} onChange={(e) => setColegio(e.target.value)} className={CLASE_CONTROL}>
              <option value="" disabled>
                {colegios.isPending ? "Cargando colegios..." : "Elegí un colegio"}
              </option>
              {(colegios.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={CLASE_ETIQUETA}>Nota (opcional)</span>
            <input
              id="seguimiento-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              maxLength={500}
              placeholder="Ej.: Ciclo 1, jueves 19/11"
              className={CLASE_CONTROL}
            />
          </label>
        </div>
        <label className="flex items-start gap-3 text-sm text-carbon">
          <input
            id="seguimiento-nombres"
            type="checkbox"
            checked={incluirNombres}
            onChange={(e) => setIncluirNombres(e.target.checked)}
            className="mt-1 size-4 accent-verde"
          />
          <span>
            Incluir nombres de alumnos en el informe
            <span className="block text-carbon/60">
              Son menores: por defecto el informe muestra solo cifras por clase. Para la tesis conviene dejarlo sin nombres.
            </span>
          </span>
        </label>
        <Boton type="submit" variante="oscuro" cargando={iniciar.isPending} disabled={!colegio}>
          <Icono nombre="seguimiento" className="size-4" />
          Iniciar seguimiento
        </Boton>
        {iniciar.isError && <MensajeEstado tipo="error">{mensajeDeError(iniciar.error, "No se pudo iniciar.")}</MensajeEstado>}
      </form>
    </Tarjeta>
  );
}

function Reloj({ desde }: { desde: string }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const seg = Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 1000));
  const hh = String(Math.floor(seg / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seg % 3600) / 60)).padStart(2, "0");
  const ss = String(seg % 60).padStart(2, "0");
  return <span className="font-mono tabular-nums">{`${hh}:${mm}:${ss}`}</span>;
}

function EnCurso({ seguimiento: s, onInforme }: { seguimiento: Seguimiento & { vivo: Resumen }; onInforme: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["seguimientos"] });
  const finalizar = useMutation({
    mutationFn: () => api.post(`/seguimientos/${s.id}/finalizar`),
    onSuccess: async () => {
      await refrescar();
      onInforme(s.id);
    },
  });
  const descartar = useMutation({ mutationFn: () => api.delete(`/seguimientos/${s.id}`), onSuccess: refrescar });
  const v = s.vivo;
  const cifras: [string, string | number][] = [
    ["Clases", v.clases],
    ["Alumnos", v.alumnos],
    ["Alertas", v.incidentes],
    ["Whitelist p95", v.latenciaP95 === null ? "—" : `${v.latenciaP95} ms`],
    ["Errores del servidor", v.erroresServidor],
  ];

  return (
    <Tarjeta variante="destacada" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-arena/70 uppercase">
            <span className="size-2 animate-pulse rounded-full bg-error" aria-hidden="true" />
            Seguimiento en curso
          </p>
          <h2 className="font-display text-3xl font-bold">{s.institucionNombre}</h2>
          <p className="text-sm text-arena/75">
            Desde {fechaHora(s.inicio)} · <Reloj desde={s.inicio} />
            {s.nota ? ` · ${s.nota}` : ""}
            {s.incluirNombres ? " · con nombres de alumnos" : ""}
          </p>
        </div>
        <Badge variante={VEREDICTO[v.veredicto].variante}>{VEREDICTO[v.veredicto].texto} hasta ahora</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cifras.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded-2xl bg-arena/10 px-3 py-2">
            <dt className="text-xs text-arena/70">{etiqueta}</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-3">
        <Boton cargando={finalizar.isPending} onClick={() => finalizar.mutate()}>
          Finalizar y generar informe
        </Boton>
        {confirmarDescarte ? (
          <>
            <Boton variante="sutil" cargando={descartar.isPending} onClick={() => descartar.mutate()}>
              Sí, descartar sin informe
            </Boton>
            <Boton variante="sutil" onClick={() => setConfirmarDescarte(false)}>
              Cancelar
            </Boton>
          </>
        ) : (
          <Boton variante="sutil" onClick={() => setConfirmarDescarte(true)}>
            Descartar
          </Boton>
        )}
      </div>
      {(finalizar.isError || descartar.isError) && (
        <p role="alert" className="rounded-xl bg-error px-3 py-2 text-sm font-medium text-arena">
          {mensajeDeError(finalizar.error ?? descartar.error, "No se pudo completar la acción.")}
        </p>
      )}
      <p className="text-xs text-arena/60">Se actualiza cada 15 segundos. Los datos del servidor se toman aunque cierres esta página.</p>
    </Tarjeta>
  );
}

function VisorInforme({ id, onVolver }: { id: number; onVolver: () => void }) {
  const informe = useQuery({
    queryKey: ["seguimientos", id, "informe"],
    queryFn: () => api.get<string>(`/seguimientos/${id}/informe`, { responseType: "text" }).then((r) => r.data),
  });

  function descargar(): void {
    if (!informe.data) return;
    const url = URL.createObjectURL(new Blob([informe.data], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `seguimiento-ens-${id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Volver onClick={onVolver}>Seguimiento</Volver>
        <Boton variante="sutil" onClick={descargar} disabled={!informe.data}>
          <Icono nombre="descargar" className="size-4" />
          Descargar HTML
        </Boton>
      </div>
      {informe.isPending ? (
        <MensajeEstado tipo="cargando">Armando el informe...</MensajeEstado>
      ) : informe.isError ? (
        <MensajeEstado tipo="error">{mensajeDeError(informe.error, "No se pudo cargar el informe.")}</MensajeEstado>
      ) : (
        // Sin scripts ni acceso a la app: el informe es solo HTML y CSS.
        <iframe
          title={`Informe de seguimiento ${id}`}
          srcDoc={informe.data}
          sandbox=""
          className="h-[78vh] w-full rounded-3xl border border-carbon/[0.07] bg-white shadow-tarjeta"
        />
      )}
    </div>
  );
}
