"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { AppShell, PantallaCargando } from "@/shared/components/AppShell";
import { IconoModo } from "@/shared/components/IconoModo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA_INTERACTIVA, Tarjeta } from "@/shared/components/Tarjeta";
import { getToken, useUsuarioActual } from "@/features/auth";
import { mensajeDeCierre, useSesionSocket } from "@/shared/hooks/useSesionSocket";
import { useSessionStorageInicial } from "@/shared/hooks/useSessionStorageInicial";
import { hostnameDe } from "@/shared/lib/url";
import type { WhitelistUrl } from "@/shared/types/sesiones";
import { VisorEmbebido } from "../components/VisorEmbebido";

// Ver la misma nota en sesiones-docente/views/DocenteView.tsx sobre sessionStorage.
const CLAVE_SESION_ACTIVA = "ens_sesion_conectada_codigo";

export default function AlumnoView({ codigoQr }: { codigoQr: string | null }) {
  const router = useRouter();
  const usuarioQuery = useUsuarioActual();
  const codigoGuardado = useSessionStorageInicial(CLAVE_SESION_ACTIVA);
  // undefined = "todavía no se tocó, usar lo guardado"; string | null =
  // override explícito (conectar / volver), pisa lo que diga el storage.
  // El código del QR pisa lo guardado: es la clase que el alumno acaba de escanear.
  const [codigoOverride, setCodigoOverride] = useState<string | null | undefined>(undefined);
  const codigoConectado = codigoOverride !== undefined ? codigoOverride : (codigoQr ?? codigoGuardado);
  const [inputCodigo, setInputCodigo] = useState("");

  useEffect(() => {
    if (usuarioQuery.data && usuarioQuery.data.usuario.rol !== "alumno") {
      router.replace("/login");
    }
  }, [usuarioQuery.data, router]);

  // Se guarda el código del QR para que sobreviva al login (sin sesión,
  // useUsuarioActual manda a /login y de ahí se vuelve a /alumno sin el
  // parámetro). Con sesión, se limpia la URL para que un refresh no
  // vuelva a forzar este código después de salir de la clase.
  useEffect(() => {
    if (!codigoQr) return;
    window.sessionStorage.setItem(CLAVE_SESION_ACTIVA, codigoQr);
    if (getToken()) router.replace("/alumno");
  }, [codigoQr, router]);

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

  // Split-screen (anteproyecto C.2): si la ventana ocupa menos del 60% del
  // área de la pantalla (pantalla dividida, ventana flotante), se avisa.
  // Por área y no por lado para no depender de la orientación. Solo se
  // manda al cambiar; al (re)conectar el servidor arranca en "no reducida".
  useEffect(() => {
    if (socket.estado !== "conectado") return;

    let reducidaAnterior = false;
    function medir(): void {
      const areaPantalla = screen.availWidth * screen.availHeight;
      const reducida = areaPantalla > 0 && window.innerWidth * window.innerHeight < areaPantalla * 0.6;
      if (reducida === reducidaAnterior) return;
      reducidaAnterior = reducida;
      enviarMensaje({ type: "geometria", reducida });
    }

    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [socket.estado, enviarMensaje]);

  // Screen Wake Lock (anteproyecto B.1): en una clase expositiva el alumno
  // no toca el celular y el SO apaga la pantalla, lo que el backend vería
  // como pestaña oculta / pantalla suspendida. El navegador suelta el lock
  // solo cuando la pestaña se oculta, por eso se vuelve a pedir al volver.
  // Sin soporte (iOS < 16.4, sin HTTPS) simplemente no hace nada.
  useEffect(() => {
    if (socket.estado !== "conectado" || !("wakeLock" in navigator)) return;

    let vigente = true;
    let sentinel: WakeLockSentinel | null = null;

    function pedir(): void {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((s) => {
          if (vigente) sentinel = s;
          else void s.release();
        })
        .catch(() => {});
    }

    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      vigente = false;
      document.removeEventListener("visibilitychange", pedir);
      void sentinel?.release();
    };
  }, [socket.estado]);

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

  if (usuarioQuery.isPending) return <PantallaCargando />;
  if (!usuarioQuery.data || usuarioQuery.data.usuario.rol !== "alumno") return null;

  const { usuario } = usuarioQuery.data;
  const conectado = socket.estado === "conectado" || socket.estado === "reconectando";

  // Visor a pantalla completa: sin barra ni navegación, todo el alto para
  // el sitio. La barra propia de VisorEmbebido (hostname + Volver) alcanza.
  if (codigoConectado && conectado && urlActiva) {
    return (
      <div className="flex h-dvh flex-col p-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <VisorEmbebido
          key={urlActiva.id}
          item={urlActiva}
          src={srcDe(urlActiva)}
          onVolver={() => setUrlActiva(null)}
        />
      </div>
    );
  }

  return (
    <AppShell
      area="Alumno"
      usuario={usuario}
      secciones={[]}
      titulo={codigoConectado ? "Tu clase" : `Hola, ${usuario.nombre}`}
      descripcion={
        codigoConectado
          ? "Tocá un sitio para abrirlo. Solo podés usar los que habilitó tu docente."
          : "Ingresá el código que te dio tu docente para unirte a la clase."
      }
    >
      {!codigoConectado ? (
        <form
          onSubmit={conectar}
          className="pizarron max-w-md space-y-5 rounded-[2rem] p-6 text-arena shadow-flotante sm:p-8"
        >
          <label htmlFor="codigo" className="block text-xs font-semibold tracking-[0.16em] text-arena/65 uppercase">
            Código de la clase
          </label>
          <input
            id="codigo"
            value={inputCodigo}
            onChange={(e) => setInputCodigo(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={6}
            placeholder="ABC123"
            required
            className="w-full rounded-2xl border-2 border-arena/25 bg-arena/[0.06] px-3 py-4 text-center font-mono text-4xl font-bold tracking-[0.3em] text-arena uppercase placeholder:text-arena/25 focus-visible:border-violeta focus-visible:outline-none"
          />
          <Boton type="submit" disabled={!inputCodigo.trim()} className="w-full">
            Unirme a la clase
          </Boton>
        </form>
      ) : socket.estado === "conectando" ? (
        <Tarjeta>
          <MensajeEstado tipo="cargando">Conectando a la clase {codigoConectado}...</MensajeEstado>
        </Tarjeta>
      ) : socket.estado === "cerrado" && socket.cierre ? (
        <Tarjeta className="max-w-md space-y-4">
          <MensajeEstado tipo="error">{mensajeDeCierre(socket.cierre.code)}</MensajeEstado>
          <Boton onClick={volver} className="w-full">
            Ingresar otro código
          </Boton>
        </Tarjeta>
      ) : conectado ? (
        <div className="space-y-5">
          <div className="pizarron flex items-center justify-between gap-4 rounded-3xl px-5 py-4 text-arena shadow-flotante">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold text-arena/70">
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${socket.estado === "conectado" ? "latido bg-celeste text-celeste" : "bg-alerta"}`}
                />
                {socket.estado === "conectado" ? "Conectado" : "Reconectando..."}
              </p>
              <p className="font-mono text-2xl font-bold tracking-[0.2em]">{codigoConectado}</p>
            </div>
            <button
              type="button"
              onClick={volver}
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-arena/75 hover:bg-arena/10 hover:text-arena focus-visible:outline focus-visible:outline-2 focus-visible:outline-arena"
            >
              Salir de la clase
            </button>
          </div>

          {avisoRevocado && <MensajeEstado tipo="error">{avisoRevocado}</MensajeEstado>}
          {!socket.sincronizado ? (
            <MensajeEstado tipo="cargando">Cargando sitios...</MensajeEstado>
          ) : socket.whitelist.length === 0 ? (
            <Tarjeta>
              <MensajeEstado tipo="vacio">
                Tu docente todavía no habilitó sitios. Aparecen acá apenas los agregue.
              </MensajeEstado>
            </Tarjeta>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {socket.whitelist.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => abrirUrl(item)}
                    className={`${CLASE_FILA_INTERACTIVA} flex h-full w-full flex-col items-start gap-4 bg-white p-4 text-left shadow-tarjeta`}
                  >
                    <span className="grid size-11 place-items-center rounded-2xl bg-papel">
                      <IconoModo modo={item.modo} className="size-5 text-carbon/70" />
                    </span>
                    <span className="w-full min-w-0 space-y-2">
                      <span className="block truncate text-sm font-semibold text-carbon">
                        {hostnameDe(item.url)}
                      </span>
                      <Badge variante={item.modo === "mirror" ? "celeste" : "verde"}>
                        {item.modo === "mirror"
                          ? "Lectura"
                          : item.modo === "proxy_general"
                            ? "Bloqueo real"
                            : "Permitido"}
                      </Badge>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
