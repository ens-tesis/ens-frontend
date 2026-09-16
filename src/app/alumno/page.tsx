"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/Badge";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { MensajeEstado } from "@/components/MensajeEstado";
import { Tarjeta } from "@/components/Tarjeta";
import { clearToken, getToken } from "@/lib/session";
import { mensajeDeCierre, useSesionSocket } from "@/lib/useSesionSocket";
import { useSessionStorageInicial } from "@/lib/useSessionStorageInicial";
import { useUsuarioActual } from "@/lib/useUsuarioActual";

// Ver la misma nota en docente/page.tsx sobre sessionStorage.
const CLAVE_SESION_ACTIVA = "ens_sesion_conectada_codigo";

export default function AlumnoPage() {
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

          {(socket.estado === "conectado" || socket.estado === "reconectando") && (
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
                {!socket.sincronizado ? (
                  <MensajeEstado tipo="cargando">Cargando whitelist...</MensajeEstado>
                ) : socket.whitelist.length === 0 ? (
                  <MensajeEstado tipo="vacio">
                    El docente todavía no habilitó ninguna URL.
                  </MensajeEstado>
                ) : (
                  <ul className="space-y-2">
                    {socket.whitelist.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg border border-carbon/10 bg-arena px-4 py-3"
                      >
                        <Badge variante="celeste">Permitido</Badge>
                        <span className="text-sm break-all text-carbon">{item.url}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
