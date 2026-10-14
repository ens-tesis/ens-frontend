"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { IconoModo } from "@/shared/components/IconoModo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { hostnameDe } from "@/shared/lib/url";
import type { WhitelistUrl } from "@/shared/types/sesiones";

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
        <div className="flex min-w-0 items-center gap-2">
          <IconoModo modo={item.modo} className="size-4 shrink-0 text-carbon/50" />
          <span className="truncate text-sm font-medium text-carbon">{hostnameDe(item.url)}</span>
          {item.modo === "mirror" && <Badge variante="celeste">Lectura</Badge>}
        </div>
        <Boton variante="sutil" onClick={onVolver} className="shrink-0">
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
        <div className="relative min-h-0 flex-1">
          {!cargada && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border border-carbon/10 bg-arena">
              <MensajeEstado tipo="cargando">Cargando...</MensajeEstado>
            </div>
          )}
          <iframe
            key={item.id}
            src={src}
            onLoad={manejarCarga}
            title={hostnameDe(item.url)}
            className="h-full min-h-[75vh] w-full rounded-lg border border-carbon/10 bg-white"
            // Antes sin sandbox (capacidades totales). Modo "mirror" es HTML
            // que generamos nosotros (sin scripts, ver lecturaArticulo.ts) —
            // no necesita ninguna capacidad, se deniega todo con sandbox=""
            // (OJO: sandbox={undefined} NO hace esto — React omite el
            // atributo entero, y un <iframe> SIN atributo sandbox corre SIN
            // ninguna restricción; es lo opuesto de lo que parece. El valor
            // tiene que estar presente, aunque sea vacío). Modo "directo" es
            // un sitio curado por el docente que sí necesita ejecutarse
            // entero (YouTube, Forms, Maps) — se le da lo mínimo para
            // funcionar, nunca acceso a hardware (cámara/mic/ubicación:
            // fuera de alcance del proyecto, ver Limitaciones del
            // anteproyecto). allow-scripts + allow-same-origin juntos es un
            // combo conocido por permitirle a una página sacarse su propio
            // sandbox — pero sin los dos juntos los embeds reales (YouTube,
            // Docs) no funcionan (verificado). Para "directo" ya se confía
            // en la URL por venir de un docente autenticado (mismo modelo
            // de confianza que el resto de la whitelist); no es la misma
            // situación que "mirror", que es contenido de un tercero no
            // confiable.
            sandbox={
              item.modo === "mirror"
                ? ""
                : "allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-presentation"
            }
            allow={item.modo === "mirror" ? undefined : "fullscreen; clipboard-write; picture-in-picture"}
          />
        </div>
      )}
    </div>
  );
}
