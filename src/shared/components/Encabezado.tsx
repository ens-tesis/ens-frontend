"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearToken } from "../auth/token";
import { Boton } from "./Boton";

interface EncabezadoProps {
  titulo: string;
  subtitulo: string;
  // Acciones extra a la izquierda de "Cerrar sesión" (p. ej. la campana).
  acciones?: ReactNode;
}

export function Encabezado({ titulo, subtitulo, acciones }: EncabezadoProps) {
  const router = useRouter();
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-carbon">{titulo}</h1>
        <p className="text-sm text-carbon/70">{subtitulo}</p>
      </div>
      <div className="flex items-center gap-2">
        {acciones}
        <Boton
          variante="sutil"
          onClick={() => {
            clearToken();
            window.sessionStorage.clear();
            router.replace("/login");
          }}
        >
          Cerrar sesión
        </Boton>
      </div>
    </header>
  );
}
