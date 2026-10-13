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
// JS cross-origin, sin acceso al contenido del iframe. Solo aplica a modo
// "directo": en modo "mirror" el iframe apunta a nuestro propio origen, que
// nunca va a rechazar embeberse, así que no tiene sentido tratarlo como un
// posible bloqueo — ver TIMEOUT_MIRROR_MS más abajo.
const TIMEOUT_CARGA_MS = 4000;

// Más generoso que el de modo directo: acá no estamos adivinando si el
// sitio nos bloqueó, solo esperando que termine de cargar (texto + todas
// las imágenes del artículo extraído) — medido empíricamente, una portada
// con varias noticias puede tardar ~4s solo en imágenes.
const TIMEOUT_MIRROR_MS = 15000;

interface VisorEmbebidoProps {
  item: WhitelistUrl;
  // URL real que carga el iframe — para modo "mirror" es nuestro propio
  // endpoint /mirror, no item.url directo (ver AlumnoView). El hostname
  // mostrado en la barra sigue siendo el del sitio original (item.url).
  src: string;
  onVolver: () => void;
}

export function VisorEmbebido({ item, src, onVolver }: VisorEmbebidoProps) {
  const [cargada, setCargada] = useState(false);
  const [fallo, setFallo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // El padre monta este componente con `key={item.id}` (ver AlumnoView), así
  // que cada URL nueva es un montaje nuevo: no hace falta resetear
  // `cargada`/`fallo` a mano, arrancan limpios solos.
  useEffect(() => {
    const timeout = item.modo === "mirror" ? TIMEOUT_MIRROR_MS : TIMEOUT_CARGA_MS;
    timerRef.current = setTimeout(() => setFallo(true), timeout);
    return () => clearTimeout(timerRef.current);
  }, [item.modo]);

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
            {item.modo === "mirror"
              ? "No se pudo cargar la versión de lectura. Probá de nuevo en un momento."
              : "Este sitio no se puede mostrar acá. Puede que no permita abrirse dentro del ENS."}
          </MensajeEstado>
          <Boton onClick={onVolver}>Volver a la lista</Boton>
        </div>
      ) : (
        <iframe
          key={item.id}
          src={src}
          onLoad={manejarCarga}
          title={hostnameDe(item.url)}
          className="min-h-[60vh] flex-1 rounded-lg border border-carbon/10 bg-white"
        />
      )}
    </div>
  );
}
