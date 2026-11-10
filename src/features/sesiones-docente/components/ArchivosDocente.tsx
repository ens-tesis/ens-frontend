"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRef } from "react";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { IconoModo } from "@/shared/components/IconoModo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";
import { urlDeArchivo } from "@/shared/lib/url";
import type { WhitelistUrl } from "@/shared/types/sesiones";

interface Archivo {
  id: number;
  nombre: string;
  mime: string;
  tamano: number;
  createdAt: string;
}

const CLAVE = ["archivos"];
// Mismo tope que el backend (archivos.routes.ts): se avisa antes de subir.
const MAX_BYTES = 25 * 1024 * 1024;

function tamanoLegible(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mensajeDeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) return err.response.data.message as string;
  return err instanceof Error && err.message ? err.message : "No se pudo completar la acción. Intentá de nuevo.";
}

// Biblioteca de archivos del docente: lo que sube queda guardado y se puede
// volver a habilitar en cualquier clase. Habilitar un archivo es agregarlo a
// la whitelist como "archivo://<id>" — viaja a los alumnos igual que un sitio.
export function ArchivosDocente({ codigo, whitelist }: { codigo: string; whitelist: WhitelistUrl[] }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const archivos = useQuery({
    queryKey: CLAVE,
    queryFn: () => api.get<{ archivos: Archivo[] }>("/archivos").then((r) => r.data.archivos),
  });

  const habilitar = useMutation({
    mutationFn: (id: number) => api.post(`/sesiones/${codigo}/whitelist`, { url: urlDeArchivo(id) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sesion", codigo] }),
  });

  // Subir = guardar en la biblioteca y habilitarlo en esta clase, de una.
  const subir = useMutation({
    mutationFn: async (archivo: File) => {
      if (archivo.size > MAX_BYTES) throw new Error("El archivo supera el máximo de 25 MB.");
      const { data } = await api.post<{ archivo: Archivo }>("/archivos", archivo, {
        params: { nombre: archivo.name },
        headers: { "Content-Type": "application/octet-stream" },
      });
      await habilitar.mutateAsync(data.archivo.id);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: CLAVE }),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/archivos/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE });
      void queryClient.invalidateQueries({ queryKey: ["sesion", codigo] });
      void queryClient.invalidateQueries({ queryKey: ["links-fijos"] });
    },
  });

  const enLaClase = new Set(whitelist.map((w) => w.url));
  const error = subir.error ?? habilitar.error ?? eliminar.error;

  return (
    <Tarjeta className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-carbon">Archivos</h3>
          <p className="text-xs text-carbon/60">
            PDF, Word, Excel, imágenes y más (hasta 25 MB). Quedan guardados para usarlos en otras clases.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          aria-label="Elegir archivo para subir"
          tabIndex={-1}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) subir.mutate(archivo);
            e.target.value = "";
          }}
        />
        <Boton cargando={subir.isPending} onClick={() => inputRef.current?.click()} className="shrink-0">
          Subir archivo
        </Boton>
      </div>

      {error && <MensajeEstado tipo="error">{mensajeDeError(error)}</MensajeEstado>}

      {archivos.isPending ? (
        <MensajeEstado tipo="cargando">Cargando tus archivos...</MensajeEstado>
      ) : (archivos.data ?? []).length === 0 ? (
        <MensajeEstado tipo="vacio">Todavía no subiste archivos.</MensajeEstado>
      ) : (
        <ul className="space-y-2">
          {(archivos.data ?? []).map((a) => {
            const habilitado = enLaClase.has(urlDeArchivo(a.id));
            return (
              <li
                key={a.id}
                className={`${CLASE_FILA} flex flex-col gap-3 bg-white p-3 pl-4 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-papel">
                    <IconoModo modo="archivo" className="size-5 text-carbon/70" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-sm font-medium text-carbon" title={a.nombre}>
                        {a.nombre}
                      </span>
                      {habilitado && <Badge variante="verde">En esta clase</Badge>}
                    </div>
                    <p className="text-xs text-carbon/55">{tamanoLegible(a.tamano)}</p>
                  </div>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                  <Boton
                    variante="sutil"
                    disabled={habilitado}
                    cargando={habilitar.isPending && habilitar.variables === a.id}
                    onClick={() => habilitar.mutate(a.id)}
                  >
                    Habilitar
                  </Boton>
                  <Boton
                    variante="sutil"
                    cargando={eliminar.isPending && eliminar.variables === a.id}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${a.nombre}"? Se quita también de las clases donde esté.`)) {
                        eliminar.mutate(a.id);
                      }
                    }}
                  >
                    Eliminar
                  </Boton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}
