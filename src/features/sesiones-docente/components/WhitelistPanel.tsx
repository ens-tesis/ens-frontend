"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { IconoModo } from "@/shared/components/IconoModo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { api } from "@/shared/api/client";
import { hostnameDe } from "@/shared/lib/url";
import type { WhitelistUrl } from "@/shared/types/sesiones";

interface WhitelistPanelProps {
  codigo: string;
  whitelist: WhitelistUrl[];
  cargando: boolean;
}

interface WhitelistResponse {
  whitelist: WhitelistUrl[];
}

interface UrlNoEmbebibleBody {
  code: "URL_NO_EMBEBIBLE";
  message: string;
  sugerenciaEmbed?: string;
  mirrorDisponible?: boolean;
}

interface AgregarInput {
  url: string;
  aceptarModoLectura?: boolean;
}

interface Bloqueo {
  url: string;
  sugerenciaEmbed: string | null;
  mirrorDisponible: boolean;
}

function leerBloqueo(err: unknown): Bloqueo | null {
  if (!axios.isAxiosError(err) || err.response?.status !== 422) return null;
  const body = err.response.data as UrlNoEmbebibleBody;
  if (body.code !== "URL_NO_EMBEBIBLE") return null;
  return {
    url: "",
    sugerenciaEmbed: body.sugerenciaEmbed ?? null,
    mirrorDisponible: Boolean(body.mirrorDisponible),
  };
}

function extraerMensajeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "No se pudo completar la acción. Intentá de nuevo.";
}

export function WhitelistPanel({ codigo, whitelist, cargando }: WhitelistPanelProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [bloqueo, setBloqueo] = useState<Bloqueo | null>(null);

  const agregar = useMutation({
    mutationFn: (input: AgregarInput) =>
      api.post<WhitelistResponse>(`/sesiones/${codigo}/whitelist`, input),
    onSuccess: () => {
      setUrl("");
      setBloqueo(null);
      setMensajeExito("URL agregada.");
      setTimeout(() => setMensajeExito(null), 2500);
      void queryClient.invalidateQueries({ queryKey: ["sesion", codigo] });
    },
    onError: (err, input) => {
      const detalle = leerBloqueo(err);
      setBloqueo(detalle ? { ...detalle, url: input.url } : null);
    },
  });

  const quitar = useMutation({
    mutationFn: (id: number) => api.delete<WhitelistResponse>(`/sesiones/${codigo}/whitelist/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sesion", codigo] });
    },
  });

  function intentarAgregar(nuevaUrl: string): void {
    setBloqueo(null);
    agregar.mutate({ url: nuevaUrl });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-carbon">Whitelist de URLs</h2>

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const limpia = url.trim();
          if (limpia) intentarAgregar(limpia);
        }}
      >
        <div className="flex-1">
          <Campo
            id="nueva-url"
            label="Agregar URL"
            type="text"
            placeholder="https://ejemplo.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Boton type="submit" cargando={agregar.isPending} disabled={!url.trim()}>
          Agregar
        </Boton>
      </form>

      {bloqueo ? (
        <div className="space-y-3 rounded-lg border border-carbon/15 bg-arena p-4">
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
                onClick={() => intentarAgregar(bloqueo.sugerenciaEmbed as string)}
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
                onClick={() => agregar.mutate({ url: bloqueo.url, aceptarModoLectura: true })}
                className="shrink-0"
              >
                Agregar así
              </Boton>
            </div>
          ) : (
            <p className="text-sm text-carbon/70">
              No encontramos una alternativa para este sitio — probá con otro recurso.
            </p>
          )}
        </div>
      ) : (
        agregar.isError && (
          <MensajeEstado tipo="error">{extraerMensajeError(agregar.error)}</MensajeEstado>
        )
      )}
      {mensajeExito && <MensajeEstado tipo="exito">{mensajeExito}</MensajeEstado>}

      {cargando ? (
        <MensajeEstado tipo="cargando">Cargando whitelist...</MensajeEstado>
      ) : whitelist.length === 0 ? (
        <MensajeEstado tipo="vacio">Todavía no agregaste ninguna URL.</MensajeEstado>
      ) : (
        <ul className="space-y-2">
          {whitelist.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-carbon/10 bg-arena px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <IconoModo modo={item.modo} className="size-4 shrink-0 text-carbon/50" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-carbon">{hostnameDe(item.url)}</span>
                    {item.modo === "mirror" && <Badge variante="celeste">Lectura</Badge>}
                  </div>
                  <p className="truncate text-xs text-carbon/55" title={item.url}>
                    {item.url}
                  </p>
                </div>
              </div>
              <Boton
                variante="sutil"
                cargando={quitar.isPending && quitar.variables === item.id}
                onClick={() => quitar.mutate(item.id)}
                className="shrink-0"
              >
                Quitar
              </Boton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
