"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { MensajeEstado } from "@/components/MensajeEstado";
import { api } from "@/lib/api";
import type { WhitelistUrl } from "@/lib/sesionesTypes";

interface WhitelistPanelProps {
  codigo: string;
  whitelist: WhitelistUrl[];
  cargando: boolean;
}

interface WhitelistResponse {
  whitelist: WhitelistUrl[];
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

  const agregar = useMutation({
    mutationFn: (nuevaUrl: string) =>
      api.post<WhitelistResponse>(`/sesiones/${codigo}/whitelist`, { url: nuevaUrl }),
    onSuccess: () => {
      setUrl("");
      setMensajeExito("URL agregada.");
      setTimeout(() => setMensajeExito(null), 2500);
      void queryClient.invalidateQueries({ queryKey: ["sesion", codigo] });
    },
  });

  const quitar = useMutation({
    mutationFn: (id: number) => api.delete<WhitelistResponse>(`/sesiones/${codigo}/whitelist/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sesion", codigo] });
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-carbon">Whitelist de URLs</h2>

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const limpia = url.trim();
          if (limpia) agregar.mutate(limpia);
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

      {agregar.isError && (
        <MensajeEstado tipo="error">{extraerMensajeError(agregar.error)}</MensajeEstado>
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
              <span className="break-all text-sm text-carbon">{item.url}</span>
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
