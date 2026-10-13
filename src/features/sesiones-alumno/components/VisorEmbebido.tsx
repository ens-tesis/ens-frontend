"use client";

import { useEffect, useRef, useState } from "react";
import { Boton } from "@/shared/components/Boton";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import type { WhitelistUrl } from "@/shared/types/sesiones";

// Sin validación de formato de URL en el backend (ver sesiones/dto/validation.ts),
// así que cualquier texto puede llegar acá — si no es una URL válida, mostramos
// el texto tal cual en vez de romper.
function hostnameDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Heurística, no detección exacta: muchos bloqueos por X-Frame-Options/CSP
// igual disparan `onLoad` (el navegador "cargó" un frame vacío/de error), así
// que este timeout no atrapa todos los casos — es lo mejor disponible desde
// JS cross-origin, sin acceso al contenido del iframe.
const TIMEOUT_CARGA_MS = 4000;

interface VisorEmbebidoProps {
  item: WhitelistUrl;
  onVolver: () => void;
}

export function VisorEmbebido({ item, onVolver }: VisorEmbebidoProps) {
  const [cargada, setCargada] = useState(false);
  const [fallo, setFallo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // El padre monta este componente con `key={item.id}` (ver AlumnoView), así
  // que cada URL nueva es un montaje nuevo: no hace falta resetear
  // `cargada`/`fallo` a mano, arrancan limpios solos.
  useEffect(() => {
    timerRef.current = setTimeout(() => setFallo(true), TIMEOUT_CARGA_MS);
    return () => clearTimeout(timerRef.current);
  }, []);

  function manejarCarga(): void {
    clearTimeout(timerRef.current);
    setCargada(true);
  }

  const bloqueado = fallo && !cargada;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-carbon/10 bg-arena px-3 py-2">
        <span className="truncate text-sm font-medium text-carbon">{hostnameDe(item.url)}</span>
        <Boton variante="sutil" onClick={onVolver}>
          Volver
        </Boton>
      </div>

      {bloqueado ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-carbon/10 bg-arena p-6 text-center">
          <MensajeEstado tipo="error">
            Este sitio no se puede mostrar acá. Puede que no permita abrirse dentro del ENS.
          </MensajeEstado>
          <Boton onClick={onVolver}>Volver a la lista</Boton>
        </div>
      ) : (
        <iframe
          key={item.id}
          src={item.url}
          onLoad={manejarCarga}
          title={hostnameDe(item.url)}
          className="min-h-[60vh] flex-1 rounded-lg border border-carbon/10 bg-white"
        />
      )}
    </div>
  );
}
