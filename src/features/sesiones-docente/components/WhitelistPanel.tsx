"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { api } from "@/shared/api/client";
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
        <div className="space-y-2 rounded-lg border border-carbon/10 bg-arena p-3">
          <MensajeEstado tipo="error">Este sitio no permite mostrarse embebido en el ENS.</MensajeEstado>
          {bloqueo.sugerenciaEmbed ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm break-all text-carbon/80">
                ¿Quisiste decir <span className="font-mono">{bloqueo.sugerenciaEmbed}</span>?
              </span>
              <Boton
                variante="sutil"
                cargando={agregar.isPending}
                onClick={() => intentarAgregar(bloqueo.sugerenciaEmbed as string)}
              >
                Agregar esta URL
              </Boton>
            </div>
          ) : bloqueo.mirrorDisponible ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-carbon/80">
                Podemos mostrarlo en modo lectura (solo texto e imágenes, sin video ni formularios).
              </span>
              <Boton
                variante="sutil"
                cargando={agregar.isPending}
                onClick={() => agregar.mutate({ url: bloqueo.url, aceptarModoLectura: true })}
              >
                Agregar en modo lectura
              </Boton>
            </div>
          ) : (
            <p className="text-sm text-carbon/70">
              No pudimos encontrar una alternativa para este sitio. Probá con otro recurso.
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
              <span className="text-sm break-all text-carbon">
                {item.url}
                {item.modo === "mirror" && (
                  <span className="ml-2 text-xs text-carbon/60">(modo lectura)</span>
                )}
              </span>
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
