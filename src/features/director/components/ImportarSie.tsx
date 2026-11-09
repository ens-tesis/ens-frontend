"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useCursos } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { CLASE_CONTROL, CLASE_ETIQUETA, Campo } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { mensajeDeError } from "@/shared/lib/errores";

interface ResultadoFila {
  fila: number;
  alumno: string;
  email: string | null;
  curso: string | null;
  estado: "creado" | "existente" | "error";
  error?: string;
}

interface Resultado {
  total: number;
  creados: number;
  existentes: number;
  fallidos: number;
  cursosCreados: string[];
  filas: ResultadoFila[];
}

const ESTADO: Record<ResultadoFila["estado"], { texto: string; variante: "verde" | "celeste" | "rojo" }> = {
  creado: { texto: "Nuevo", variante: "verde" },
  existente: { texto: "Ya existía", variante: "celeste" },
  error: { texto: "Error", variante: "rojo" },
};

// Excel en español guarda los CSV en Windows-1252, no en UTF-8: si el
// archivo no es UTF-8 válido se relee así, para no romper las tildes.
async function leerTexto(archivo: File): Promise<string> {
  const bytes = await archivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

// Alta masiva de alumnos desde el CSV exportado del SIE (US-DI-02).
export function ImportarSie() {
  const queryClient = useQueryClient();
  const cursos = useCursos();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cursoId, setCursoId] = useState("");
  const [password, setPassword] = useState("");

  const importar = useMutation({
    mutationFn: async () => {
      const contenido = await leerTexto(archivo!);
      const res = await api.post<Resultado>("/cursos/importar-sie", {
        archivoNombre: archivo!.name,
        contenido,
        ...(cursoId && { cursoId: Number(cursoId) }),
        ...(password && { passwordProvisoria: password }),
      });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cursos"] });
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });

  const r = importar.data;
  const filas = r ? [...r.filas].sort((a, b) => Number(b.estado === "error") - Number(a.estado === "error")) : [];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
      <form
        className="space-y-4 rounded-3xl border border-carbon/[0.07] bg-white p-5 shadow-tarjeta sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (archivo) importar.mutate();
        }}
      >
        <h2 className="font-display text-xl font-bold text-carbon">Importar alumnos</h2>
        <label className="block space-y-1.5">
          <span className={CLASE_ETIQUETA}>Archivo CSV del SIE</span>
          <input
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              importar.reset();
            }}
            className="block w-full text-sm text-carbon file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-celeste file:px-4 file:font-semibold file:text-carbon"
          />
        </label>
        <label className="block space-y-1.5">
          <span className={CLASE_ETIQUETA}>Curso (si el archivo no trae columna de curso)</span>
          <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={CLASE_CONTROL}>
            <option value="">Ninguno</option>
            {(cursos.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.anioLectivo})
              </option>
            ))}
          </select>
        </label>
        <Campo id="sie-password" label="Contraseña provisoria (vacío = su DNI)" type="text" minLength={8}
          autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        {importar.isError && (
          <MensajeEstado tipo="error">{mensajeDeError(importar.error, "No se pudo importar el archivo.")}</MensajeEstado>
        )}
        <Boton type="submit" cargando={importar.isPending} disabled={!archivo} className="w-full">
          Importar
        </Boton>
        <p className="text-xs leading-relaxed text-carbon/60">
          Columnas que se reconocen (en cualquier orden): DNI, Apellido, Nombre o &quot;Apellido y Nombre&quot;,
          Email, Curso o Año + División, Turno. Hace falta el nombre y el DNI o el email. Sin email, el alumno
          entra con <span className="font-mono">DNI@alumnos.ens</span>. Todos cambian la contraseña en el primer
          ingreso. Reimportar el mismo archivo no duplica alumnos.
        </p>
      </form>

      {r && (
        <Tarjeta className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variante="verde">{r.creados} nuevos</Badge>
            <Badge variante="celeste">{r.existentes} ya existían</Badge>
            {r.fallidos > 0 && <Badge variante="rojo">{r.fallidos} con error</Badge>}
          </div>
          {r.cursosCreados.length > 0 && (
            <MensajeEstado tipo="info">Cursos creados: {r.cursosCreados.join(", ")}.</MensajeEstado>
          )}
          <ul className="divide-y divide-carbon/[0.07]">
            {filas.map((f) => (
              <li key={f.fila} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-10 shrink-0 text-xs text-carbon/50 tabular-nums">#{f.fila}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-carbon">{f.alumno}</span>
                  <span className="block truncate text-xs text-carbon/60">
                    {f.estado === "error" ? f.error : [f.email, f.curso].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Badge variante={ESTADO[f.estado].variante}>{ESTADO[f.estado].texto}</Badge>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}
