"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import QRCode from "qrcode";
import { useRef, useState } from "react";
import { Icono } from "@/shared/components/Icono";

interface CodigoSesionProps {
  codigo: string;
  // Nombre del curso de esta clase, si tiene.
  curso: string | null;
  // "En vivo" / "Reconectando..." según el socket.
  estado: string;
  enVivo: boolean;
}

// El QR apunta a /alumno?codigo=...: escanearlo une al alumno directo a
// esta clase. Cada clase tiene su código, así que el QR cambia solo en
// cada clase nueva y uno viejo no sirve para entrar a otra.
function useQrDeClase(codigo: string) {
  return useQuery({
    queryKey: ["qr", codigo],
    queryFn: () =>
      QRCode.toDataURL(`${window.location.origin}/alumno?codigo=${encodeURIComponent(codigo)}`, {
        width: 720,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#14342b", light: "#eae2b7" },
      }),
    staleTime: Infinity,
  });
}

function ImagenQr({ src, codigo, className }: { src: string; codigo: string; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL generada en el cliente
    <img src={src} alt={`Código QR para unirse a la clase ${codigo}`} className={className} />
  );
}

// El código escrito en el pizarrón: lo primero que el docente le muestra a
// la clase, así que es lo más grande de la pantalla.
export function CodigoSesion({ codigo, curso, estado, enVivo }: CodigoSesionProps) {
  const [copiado, setCopiado] = useState(false);
  const qr = useQrDeClase(codigo);
  const proyeccion = useRef<HTMLDialogElement>(null);

  async function copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard puede fallar (permisos, contexto no seguro); no es
      // crítico, el código ya está visible en pantalla igual.
    }
  }

  const CLASE_BOTON =
    "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-transform active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arena";

  return (
    <section
      aria-label="Código de la clase"
      className="pizarron relative overflow-hidden rounded-[2rem] px-6 pt-5 pb-6 text-arena shadow-flotante sm:px-10 sm:pt-7 sm:pb-9"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-semibold tracking-[0.16em] text-arena/65 uppercase">
          {curso ? `Clase de ${curso}` : "Código de la clase"}
        </p>
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-arena/10 px-3 py-1 text-xs font-semibold">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${enVivo ? "latido bg-celeste text-celeste" : "bg-alerta"}`}
          />
          {estado}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-6 sm:mt-6">
        <div className="min-w-0">
          <p className="font-mono text-[clamp(2.75rem,14vw,6.5rem)] leading-none font-bold tracking-[0.18em]">
            {codigo}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2 sm:mt-8">
            <button
              type="button"
              onClick={() => proyeccion.current?.showModal()}
              disabled={!qr.data}
              className={`${CLASE_BOTON} bg-violeta text-carbon hover:bg-violeta-hover disabled:opacity-50`}
            >
              <Icono nombre="qr" className="size-4" />
              Mostrar QR
            </button>
            <button type="button" onClick={() => void copiar()} className={`${CLASE_BOTON} bg-arena/10 hover:bg-arena/15`}>
              <Icono nombre="copiar" className="size-4" />
              {copiado ? "¡Copiado!" : "Copiar código"}
            </button>
            <Link href={`/docente/asistencia/${codigo}`} className={`${CLASE_BOTON} bg-arena/10 hover:bg-arena/15`}>
              <Icono nombre="asistencia" className="size-4" />
              Asistencia
            </Link>
          </div>
          <p className="mt-4 text-sm text-arena/70">
            Los alumnos escanean el QR o escriben el código en su pantalla.
          </p>
        </div>

        {qr.data && (
          <button
            type="button"
            onClick={() => proyeccion.current?.showModal()}
            aria-label="Ampliar código QR"
            className="hidden shrink-0 rounded-3xl bg-arena p-2 transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arena md:block"
          >
            <ImagenQr src={qr.data} codigo={codigo} className="size-44 lg:size-52" />
          </button>
        )}
      </div>

      {/* Para proyectar en el aula: QR enorme + código, a pantalla completa. */}
      <dialog
        ref={proyeccion}
        aria-label={`QR de la clase ${codigo}`}
        onClick={() => proyeccion.current?.close()}
        className="pizarron m-0 h-dvh max-h-none w-screen max-w-none p-0 text-arena backdrop:bg-verde"
      >
        <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
          <p className="font-display text-2xl font-bold sm:text-4xl">Escaneá para unirte{curso ? ` a ${curso}` : ""}</p>
          {qr.data && (
            <span className="rounded-[2rem] bg-arena p-3">
              <ImagenQr src={qr.data} codigo={codigo} className="size-[min(70vw,58vh)]" />
            </span>
          )}
          <p className="font-mono text-4xl font-bold tracking-[0.2em] sm:text-6xl">{codigo}</p>
          <button
            type="button"
            onClick={() => proyeccion.current?.close()}
            className={`${CLASE_BOTON} bg-arena/10 hover:bg-arena/15`}
          >
            Cerrar
          </button>
        </div>
      </dialog>
    </section>
  );
}
