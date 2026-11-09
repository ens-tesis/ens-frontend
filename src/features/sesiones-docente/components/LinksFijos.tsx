"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { IconoModo } from "@/shared/components/IconoModo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";
import { tituloDe } from "@/shared/lib/url";
import type { LinkFijo } from "@/shared/types/sesiones";

const CLAVE = ["links-fijos"];

// Links que el docente fijó: se cargan solos en cada clase nueva del curso
// (o de todos sus cursos). Se fijan desde "Sitios" durante una clase.
export function useLinksFijos() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: CLAVE,
    queryFn: () => api.get<{ links: LinkFijo[] }>("/links-fijos").then((r) => r.data.links),
  });
  const actualizar = (r: { data: { links: LinkFijo[] } }) => queryClient.setQueryData(CLAVE, r.data.links);
  const fijar = useMutation({
    mutationFn: (input: { whitelistUrlId: number; todosLosCursos: boolean }) =>
      api.post<{ links: LinkFijo[] }>("/links-fijos", input),
    onSuccess: actualizar,
  });
  const quitar = useMutation({
    mutationFn: (id: number) => api.delete<{ links: LinkFijo[] }>(`/links-fijos/${id}`),
    onSuccess: actualizar,
  });
  return { query, fijar, quitar };
}

export function LinksFijos() {
  const { query, quitar } = useLinksFijos();
  const links = query.data ?? [];

  return (
    <Tarjeta className="max-w-xl space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold text-carbon">Tus links fijos</h2>
        <p className="text-sm text-carbon/65">
          Se cargan solos cada vez que empezás una clase. Para fijar uno, agregalo en una clase y tocá
          &quot;Fijar&quot;.
        </p>
      </div>
      {query.isPending ? (
        <MensajeEstado tipo="cargando">Cargando links fijos...</MensajeEstado>
      ) : query.isError ? (
        <MensajeEstado tipo="error">No se pudieron cargar tus links fijos.</MensajeEstado>
      ) : links.length === 0 ? (
        <MensajeEstado tipo="vacio">Todavía no fijaste ningún link.</MensajeEstado>
      ) : (
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.id} className={`${CLASE_FILA} flex items-center gap-3 bg-papel p-3 pl-4`}>
              <IconoModo modo={l.modo} className="size-5 shrink-0 text-carbon/60" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium text-carbon">{tituloDe(l)}</p>
                <p className="truncate text-xs text-carbon/55" title={l.url}>
                  {l.url}
                </p>
                <Badge variante={l.cursoId === null ? "verde" : "celeste"}>{l.curso ?? "Todos los cursos"}</Badge>
              </div>
              <Boton
                variante="sutil"
                cargando={quitar.isPending && quitar.variables === l.id}
                onClick={() => quitar.mutate(l.id)}
                className="shrink-0"
              >
                Quitar
              </Boton>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
