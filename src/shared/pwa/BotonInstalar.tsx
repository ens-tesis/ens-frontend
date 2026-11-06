"use client";

import { useRef } from "react";
import { Boton } from "../components/Boton";
import { Icono } from "../components/Icono";
import { useInstalacion } from "./useInstalacion";

const PASOS_IOS = [
  "Tocá el botón Compartir (el cuadrado con la flecha hacia arriba) en Safari.",
  "Elegí «Agregar a inicio».",
  "Confirmá con «Agregar». El ENS queda como una app más.",
];

const PASOS_MANUAL = [
  "Abrí el menú del navegador (los tres puntos ⋮).",
  "Elegí «Instalar app» o «Agregar a pantalla de inicio».",
  "Confirmá. El ENS se abre como una app, sin barra del navegador.",
];

// Botón "Instalar app": abre el diálogo nativo cuando el navegador lo
// ofrece (Chrome/Edge/Android) y si no, explica los pasos a mano.
export function BotonInstalar({ className, sobreVerde = false }: { className?: string; sobreVerde?: boolean }) {
  const { estado, instalarNativo } = useInstalacion();
  const dialogo = useRef<HTMLDialogElement>(null);

  if (estado === "instalada") return null;

  const pasos = estado === "ios" ? PASOS_IOS : PASOS_MANUAL;

  return (
    <>
      <button
        type="button"
        onClick={() => (estado === "nativa" ? void instalarNativo() : dialogo.current?.showModal())}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          sobreVerde
            ? "text-arena/80 hover:bg-arena/10 hover:text-arena focus-visible:outline-arena"
            : "text-carbon hover:bg-papel focus-visible:outline-carbon"
        } ${className ?? ""}`}
      >
        <Icono nombre="descargar" />
        Instalar app
      </button>

      {/* <dialog> nativo: trae foco atrapado y cierre con Escape gratis. */}
      <dialog
        ref={dialogo}
        aria-labelledby="titulo-instalar"
        onClick={(e) => e.target === e.currentTarget && dialogo.current?.close()}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl bg-white p-0 text-carbon shadow-flotante backdrop:bg-carbon/45"
      >
        <div className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- ícono estático chico */}
            <img src="/icon-192.png" alt="" className="size-12 rounded-xl" />
            <div>
              <h2 id="titulo-instalar" className="font-display text-xl font-bold">
                Instalá el ENS
              </h2>
              <p className="text-sm text-carbon/60">Abrilo desde tu pantalla de inicio, como cualquier app.</p>
            </div>
          </div>
          <ol className="space-y-3">
            {pasos.map((p, i) => (
              <li key={p} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-verde text-xs font-bold text-arena">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
          <Boton variante="sutil" className="w-full" onClick={() => dialogo.current?.close()}>
            Entendido
          </Boton>
        </div>
      </dialog>
    </>
  );
}
