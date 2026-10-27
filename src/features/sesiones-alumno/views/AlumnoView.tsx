"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { IconoModo } from "@/shared/components/IconoModo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { clearToken, getToken, useUsuarioActual } from "@/features/auth";
import { mensajeDeCierre, useSesionSocket } from "@/shared/hooks/useSesionSocket";
import { useSessionStorageInicial } from "@/shared/hooks/useSessionStorageInicial";
import { hostnameDe } from "@/shared/lib/url";
import type { WhitelistUrl } from "@/shared/types/sesiones";
import { VisorEmbebido } from "../components/VisorEmbebido";

// Ver la misma nota en sesiones-docente/views/DocenteView.tsx sobre sessionStorage.
const CLAVE_SESION_ACTIVA = "ens_sesion_conectada_codigo";

export default function AlumnoView() {
  const router = useRouter();
  const usuarioQuery = useUsuarioActual();
  const codigoGuardado = useSessionStorageInicial(CLAVE_SESION_ACTIVA);
  // undefined = "todavía no se tocó, usar lo guardado"; string | null =
  // override explícito (conectar / volver), pisa lo que diga el storage.
  const [codigoOverride, setCodigoOverride] = useState<string | null | undefined>(undefined);
  const codigoConectado = codigoOverride !== undefined ? codigoOverride : codigoGuardado;
  const [inputCodigo, setInputCodigo] = useState("");

  useEffect(() => {
    if (usuarioQuery.data && usuarioQuery.data.usuario.rol !== "alumno") {
      router.replace("/login");
    }
  }, [usuarioQuery.data, router]);

  const token = getToken();
  const socket = useSesionSocket(codigoConectado, token);
  const { enviarMensaje } = socket;

  // Modelo "launcher": el alumno no navega libremente, elige un destino de
  // la whitelist y se embebe de a uno. Si el docente lo saca de la
  // whitelist mientras se está viendo, se corta al instante (ver RF-04).
  const [urlActiva, setUrlActiva] = useState<WhitelistUrl | null>(null);
  const [avisoRevocado, setAvisoRevocado] = useState<string | null>(null);

  // Ajuste de estado durante el render (no un efecto): cada mensaje nuevo de
  // whitelist_update trae un array nuevo por referencia (ver useSesionSocket),
  // así que comparar !== detecta "llegó una actualización" sin necesitar un
  // useEffect — patrón recomendado por React para ajustar estado derivado de
  // una prop/estado externo que cambia, evita el lint de setState-en-efecto.
  const [whitelistProcesada, setWhitelistProcesada] = useState(socket.whitelist);
  if (socket.whitelist !== whitelistProcesada) {
    setWhitelistProcesada(socket.whitelist);
    if (urlActiva && !socket.whitelist.some((item) => item.id === urlActiva.id)) {
      setUrlActiva(null);
      setAvisoRevocado("El docente quitó esa página de los permitidos.");
    }
  }

  // La whitelist no valida formato en el backend (ver sesiones/dto/validation.ts
  // — solo longitud), así que un valor como `javascript:...` o
  // `data:text/html,<script>` podría llegar acá. Antes de este visor era
  // inofensivo (solo se mostraba como texto); ahora que se carga como `src`
  // de un iframe, hay que cortarlo acá, en el único lugar donde se abre una
  // URL, antes de que llegue a montarse.
  function esAbribleEnIframe(url: string): boolean {
    try {
      const protocolo = new URL(url).protocol;
      return protocolo === "http:" || protocolo === "https:";
    } catch {
      return false;
    }
  }

  function abrirUrl(item: WhitelistUrl): void {
    if (!esAbribleEnIframe(item.url)) {
      setAvisoRevocado("Esa URL no se puede abrir.");
      return;
    }
    setAvisoRevocado(null);
    setUrlActiva(item);
  }

  // En modo "directo" el iframe apunta al sitio original tal cual. En los
  // otros dos modos no (eso es justamente lo que no se puede embeber
  // directo) sino a nuestros propios endpoints, que sirven una versión
  // generada server-side a partir del sitio original (ver
  // verificarEmbebible.ts / mirror.controller.ts en el backend): "mirror" es
  // una versión de lectura extraída (solo texto/imágenes, sin scripts) vía
  // /mirror; "proxy_general" es el HTML real del sitio reescrito para
  // servirse desde nuestro origen, con su JS/CSS intactos, vía
  // /mirror/pagina (ver reescritorHtml.ts).
  function srcDe(item: WhitelistUrl): string {
    if (item.modo === "directo") return item.url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const ruta = item.modo === "proxy_general" ? "mirror/pagina" : "mirror";
    const params = new URLSearchParams({ url: item.url, token: token ?? "" });
    return `${apiUrl}/${ruta}?${params.toString()}`;
  }

  // Le avisa al backend cuando esta pestaña deja de estar en foco (u
  // vuelve) — ver "Fuera de Foco"/"Ausente Digital" en sesiones.ws.ts.
  // Solo tiene sentido reportarlo con el socket ya conectado.
  useEffect(() => {
    if (socket.estado !== "conectado") return;

    function reportarFoco(): void {
      enviarMensaje({
        type: "presencia",
        estado: document.hidden ? "fuera_de_foco" : "conectado",
      });
    }

    document.addEventListener("visibilitychange", reportarFoco);
    return () => document.removeEventListener("visibilitychange", reportarFoco);
  }, [socket.estado, enviarMensaje]);

  function conectar(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const codigo = inputCodigo.trim().toUpperCase();
    if (!codigo) return;
    window.sessionStorage.setItem(CLAVE_SESION_ACTIVA, codigo);
    setCodigoOverride(codigo);
  }

  function volver(): void {
    window.sessionStorage.removeItem(CLAVE_SESION_ACTIVA);
    setCodigoOverride(null);
    setInputCodigo("");
  }

  function cerrarSesion(): void {
    clearToken();
    window.sessionStorage.removeItem(CLAVE_SESION_ACTIVA);
    router.replace("/login");
  }

  if (usuarioQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <MensajeEstado tipo="cargando">Cargando...</MensajeEstado>
      </div>
    );
  }

  if (!usuarioQuery.data || usuarioQuery.data.usuario.rol !== "alumno") {
    return null;
  }

  const { usuario } = usuarioQuery.data;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-carbon">ENS</h1>
          <p className="text-xs text-carbon/70">{usuario.nombre}</p>
        </div>
        <Boton variante="sutil" onClick={cerrarSesion}>
          Salir
        </Boton>
      </header>

      {!codigoConectado ? (
        <Tarjeta className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-carbon">Unirte a una clase</h2>
          <form className="flex flex-col gap-4" onSubmit={conectar}>
            <Campo
              id="codigo"
              label="Código de la sesión"
              value={inputCodigo}
              onChange={(e) => setInputCodigo(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={6}
              placeholder="ABC123"
              className="text-center font-mono text-2xl tracking-[0.3em] uppercase"
              required
            />
            <Boton type="submit" disabled={!inputCodigo.trim()} className="w-full">
              Conectarme
            </Boton>
          </form>
        </Tarjeta>
      ) : (
        <div className="flex flex-col gap-4">
          {socket.estado === "conectando" && (
            <Tarjeta>
              <MensajeEstado tipo="cargando">
                Conectando a la clase {codigoConectado}...
              </MensajeEstado>
            </Tarjeta>
          )}

          {socket.estado === "cerrado" && socket.cierre && (
            <Tarjeta className="flex flex-col gap-4 text-center">
              <MensajeEstado tipo="error">{mensajeDeCierre(socket.cierre.code)}</MensajeEstado>
              <Boton onClick={volver} className="w-full">
                Ingresar otro código
              </Boton>
            </Tarjeta>
          )}

          {(socket.estado === "conectado" || socket.estado === "reconectando") &&
            (urlActiva ? (
              <VisorEmbebido
                key={urlActiva.id}
                item={urlActiva}
                src={srcDe(urlActiva)}
                onVolver={() => setUrlActiva(null)}
              />
            ) : (
              <>
                <Tarjeta variante="destacada" className="text-center">
                  <p className="text-sm text-arena/80">
                    {socket.estado === "conectado" ? "Conectado a la clase" : "Reconectando..."}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-arena">
                    {codigoConectado}
                  </p>
                </Tarjeta>

                <div className="space-y-3">
                  <h2 className="text-base font-semibold text-carbon">Sitios permitidos</h2>
                  {avisoRevocado && <MensajeEstado tipo="error">{avisoRevocado}</MensajeEstado>}
                  {!socket.sincronizado ? (
                    <MensajeEstado tipo="cargando">Cargando whitelist...</MensajeEstado>
                  ) : socket.whitelist.length === 0 ? (
                    <MensajeEstado tipo="vacio">
                      El docente todavía no habilitó ninguna URL.
                    </MensajeEstado>
                  ) : (
                    <ul className="space-y-2">
                      {socket.whitelist.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => abrirUrl(item)}
                            className="flex w-full items-center gap-3 rounded-lg border border-carbon/10 bg-arena px-4 py-3 text-left transition-colors hover:bg-carbon/5"
                          >
                            <IconoModo modo={item.modo} className="size-4 shrink-0 text-carbon/50" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-carbon">
                              {hostnameDe(item.url)}
                            </span>
                            <Badge variante={item.modo === "mirror" ? "celeste" : "verde"}>
                              {item.modo === "mirror"
                                ? "Lectura"
                                : item.modo === "proxy_general"
                                  ? "Bloqueo real"
                                  : "Permitido"}
                            </Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ))}
        </div>
      )}
    </div>
  );
}
