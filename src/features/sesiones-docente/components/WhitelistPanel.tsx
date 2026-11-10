"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { Icono } from "@/shared/components/Icono";
import { IconoModo } from "@/shared/components/IconoModo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";
import { api } from "@/shared/api/client";
import { hostnameDe, tituloDe } from "@/shared/lib/url";
import type { LinkReciente, WhitelistUrl } from "@/shared/types/sesiones";
import { ArchivosDocente } from "./ArchivosDocente";
import { useLinksFijos } from "./LinksFijos";

interface WhitelistPanelProps {
  codigo: string;
  whitelist: WhitelistUrl[];
  cargando: boolean;
  curso: { id: number; nombre: string } | null;
}

interface WhitelistResponse {
  whitelist: WhitelistUrl[];
}

interface UrlNoEmbebibleBody {
  code: "URL_NO_EMBEBIBLE";
  message: string;
  sugerenciaEmbed?: string;
  mirrorDisponible?: boolean;
  ayuda?: string;
}

interface AgregarInput {
  url: string;
  nombre?: string | null;
  aceptarModoLectura?: boolean;
}

interface Bloqueo {
  url: string;
  nombre: string | null;
  sugerenciaEmbed: string | null;
  mirrorDisponible: boolean;
  // Explicación del backend de qué link sí sirve (ej. Canva).
  ayuda: string | null;
}

function leerBloqueo(err: unknown): Bloqueo | null {
  if (!axios.isAxiosError(err) || err.response?.status !== 422) return null;
  const body = err.response.data as UrlNoEmbebibleBody;
  if (body.code !== "URL_NO_EMBEBIBLE") return null;
  return {
    url: "",
    nombre: null,
    sugerenciaEmbed: body.sugerenciaEmbed ?? null,
    mirrorDisponible: Boolean(body.mirrorDisponible),
    ayuda: body.ayuda ?? null,
  };
}

function extraerMensajeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "No se pudo completar la acción. Intentá de nuevo.";
}

export function WhitelistPanel({ codigo, whitelist, cargando, curso }: WhitelistPanelProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [nombre, setNombre] = useState("");
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [bloqueo, setBloqueo] = useState<Bloqueo | null>(null);
  const [fijando, setFijando] = useState<number | null>(null);
  const fijos = useLinksFijos();

  const recientes = useQuery({
    queryKey: ["sesion", codigo, "links-recientes"],
    queryFn: () =>
      api.get<{ links: LinkReciente[] }>(`/sesiones/${codigo}/links-recientes`).then((r) => r.data.links),
  });

  const agregar = useMutation({
    mutationFn: (input: AgregarInput) =>
      api.post<WhitelistResponse>(`/sesiones/${codigo}/whitelist`, input),
    onSuccess: () => {
      setUrl("");
      setNombre("");
      setBloqueo(null);
      setMensajeExito("URL agregada.");
      setTimeout(() => setMensajeExito(null), 2500);
      void queryClient.invalidateQueries({ queryKey: ["sesion", codigo] });
    },
    onError: (err, input) => {
      const detalle = leerBloqueo(err);
      setBloqueo(detalle ? { ...detalle, url: input.url, nombre: input.nombre ?? null } : null);
    },
  });

  // Links fijos que aplican a esta clase (los de su curso y los de todos).
  const fijoDe = (u: string) =>
    (fijos.query.data ?? []).find((f) => f.url === u && (f.cursoId === null || f.cursoId === curso?.id));
  const enLaClase = new Set(whitelist.map((w) => w.url));
  const sugeridos = (recientes.data ?? []).filter((r) => !enLaClase.has(r.url));

  const quitar = useMutation({
    mutationFn: (id: number) => api.delete<WhitelistResponse>(`/sesiones/${codigo}/whitelist/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sesion", codigo] });
    },
  });

  function intentarAgregar(nuevaUrl: string, nuevoNombre: string | null): void {
    setBloqueo(null);
    agregar.mutate({ url: nuevaUrl, nombre: nuevoNombre });
  }

  return (
    <div className="space-y-4">
      <Tarjeta className="space-y-4">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const limpia = url.trim();
          if (limpia) intentarAgregar(limpia, nombre.trim() || null);
        }}
      >
        <div className="flex-1">
          <Campo
            id="nueva-url"
            label="Agregar URL"
            type="text"
            placeholder="ejemplo.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="sm:w-56">
          <Campo
            id="nombre-url"
            label="Nombre (opcional)"
            type="text"
            placeholder="Guía de fracciones"
            maxLength={100}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <Boton type="submit" cargando={agregar.isPending} disabled={!url.trim()}>
          Agregar
        </Boton>
      </form>

      {bloqueo ? (
        <div className="space-y-3 rounded-2xl bg-celeste/35 p-4">
          <p className="text-sm text-carbon/70">Ese link no se puede mostrar embebido tal cual.</p>
          {bloqueo.sugerenciaEmbed ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variante="celeste">Sugerencia</Badge>
                <span className="truncate text-sm text-carbon/80" title={bloqueo.sugerenciaEmbed}>
                  {hostnameDe(bloqueo.sugerenciaEmbed)}
                </span>
              </div>
              <Boton
                cargando={agregar.isPending}
                onClick={() => intentarAgregar(bloqueo.sugerenciaEmbed as string, bloqueo.nombre)}
                className="shrink-0"
              >
                Usar esta URL
              </Boton>
            </div>
          ) : bloqueo.mirrorDisponible ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Badge variante="celeste">Modo lectura</Badge>
                <span className="text-sm text-carbon/80">Solo texto e imágenes, sin video ni formularios.</span>
              </div>
              <Boton
                cargando={agregar.isPending}
                onClick={() => agregar.mutate({ url: bloqueo.url, nombre: bloqueo.nombre, aceptarModoLectura: true })}
                className="shrink-0"
              >
                Agregar así
              </Boton>
            </div>
          ) : (
            !bloqueo.ayuda && (
              <p className="text-sm text-carbon/70">
                No encontramos una alternativa para este sitio — probá con otro recurso.
              </p>
            )
          )}
          {bloqueo.ayuda && <p className="text-sm text-carbon/80">{bloqueo.ayuda}</p>}
        </div>
      ) : (
        agregar.isError && (
          <MensajeEstado tipo="error">{extraerMensajeError(agregar.error)}</MensajeEstado>
        )
      )}
      {mensajeExito && <MensajeEstado tipo="exito">{mensajeExito}</MensajeEstado>}

      </Tarjeta>

      {cargando ? (
        <MensajeEstado tipo="cargando">Cargando whitelist...</MensajeEstado>
      ) : whitelist.length === 0 ? (
        <MensajeEstado tipo="vacio">Todavía no agregaste sitios. Los que agregues aparecen al instante en la pantalla de los alumnos.</MensajeEstado>
      ) : (
        <ul className="space-y-2">
          {whitelist.map((item) => {
            const fijo = fijoDe(item.url);
            return (
              <li key={item.id} className={`${CLASE_FILA} space-y-3 bg-white p-3 pl-4 shadow-tarjeta`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-papel"><IconoModo modo={item.modo} className="size-5 text-carbon/70" /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-sm font-medium text-carbon">{tituloDe(item)}</span>
                        {item.modo === "mirror" && <Badge variante="celeste">Lectura</Badge>}
                        {(item.modo === "proxy_general" || item.modo === "proxy_sesion") && (
                          <Badge variante="verde">Bloqueo real</Badge>
                        )}
                        {item.modo === "archivo" && <Badge variante="celeste">Archivo</Badge>}
                        {fijo && <Badge variante="ambar">Fijo · {fijo.curso ?? "todos los cursos"}</Badge>}
                      </div>
                      {item.modo !== "archivo" && (
                        <p className="truncate text-xs text-carbon/55" title={item.url}>
                          {item.url}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                    {fijo ? (
                      <Boton
                        variante="sutil"
                        cargando={fijos.quitar.isPending && fijos.quitar.variables === fijo.id}
                        onClick={() => fijos.quitar.mutate(fijo.id)}
                      >
                        Desfijar
                      </Boton>
                    ) : (
                      <Boton
                        variante="sutil"
                        aria-expanded={fijando === item.id}
                        onClick={() => setFijando(fijando === item.id ? null : item.id)}
                      >
                        Fijar
                      </Boton>
                    )}
                    <Boton
                      variante="sutil"
                      cargando={quitar.isPending && quitar.variables === item.id}
                      onClick={() => quitar.mutate(item.id)}
                    >
                      Quitar
                    </Boton>
                  </div>
                </div>
                {fijando === item.id && !fijo && (
                  <div className="flex flex-col gap-2 rounded-2xl bg-papel p-3 sm:flex-row sm:items-center">
                    <p className="flex-1 text-sm text-carbon/75">Que se cargue solo al empezar cada clase de:</p>
                    {curso && (
                      <Boton
                        cargando={fijos.fijar.isPending && !fijos.fijar.variables?.todosLosCursos}
                        onClick={() =>
                          fijos.fijar.mutate(
                            { whitelistUrlId: item.id, todosLosCursos: false },
                            { onSuccess: () => setFijando(null) },
                          )
                        }
                      >
                        {curso.nombre}
                      </Boton>
                    )}
                    <Boton
                      variante={curso ? "sutil" : "primario"}
                      cargando={fijos.fijar.isPending && fijos.fijar.variables?.todosLosCursos}
                      onClick={() =>
                        fijos.fijar.mutate(
                          { whitelistUrlId: item.id, todosLosCursos: true },
                          { onSuccess: () => setFijando(null) },
                        )
                      }
                    >
                      Todos mis cursos
                    </Boton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ArchivosDocente codigo={codigo} whitelist={whitelist} />

      {fijos.fijar.isError && (
        <MensajeEstado tipo="error">{extraerMensajeError(fijos.fijar.error)}</MensajeEstado>
      )}

      {sugeridos.length > 0 && (
        <Tarjeta className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-carbon">
              Usados antes {curso ? `en ${curso.nombre}` : "en clases sin curso"}
            </h3>
            <p className="text-xs text-carbon/60">Tocá uno para volver a habilitarlo en esta clase.</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {sugeridos.map((r) => (
              <li key={r.url}>
                <button
                  type="button"
                  title={r.url}
                  disabled={agregar.isPending}
                  onClick={() =>
                    agregar.mutate({ url: r.url, nombre: r.nombre, aceptarModoLectura: r.modo === "mirror" })
                  }
                  className="inline-flex min-h-10 max-w-64 items-center gap-2 rounded-full border border-carbon/15 bg-white px-3 text-sm font-medium text-carbon hover:border-carbon/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon disabled:opacity-50"
                >
                  <Icono nombre="mas" className="size-4 shrink-0" />
                  <span className="truncate">{tituloDe(r)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}
