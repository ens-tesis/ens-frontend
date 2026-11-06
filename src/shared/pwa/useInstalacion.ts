"use client";

import { useSyncExternalStore } from "react";

// No está en lib.dom: solo Chromium (Chrome, Edge, Samsung Internet) lo
// dispara cuando la PWA cumple los requisitos para instalarse.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// "nativa": se puede abrir el diálogo de instalación del navegador.
// "ios": Safari no tiene API, hay que explicar "Compartir → Agregar a inicio".
// "manual": otro navegador; se explica cómo hacerlo desde su menú.
export type EstadoInstalacion = "instalada" | "nativa" | "ios" | "manual";

let evento: BeforeInstallPromptEvent | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

// A nivel módulo y no en un efecto: Chrome dispara beforeinstallprompt una
// sola vez, apenas carga la página, y se perdería si nadie lo escucha.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evento = e as BeforeInstallPromptEvent;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    evento = null;
    avisar();
  });
}

function leer(): EstadoInstalacion {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "instalada";
  if (evento) return "nativa";
  // iPadOS se presenta como Mac: se lo distingue por la pantalla táctil.
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "manual";
}

function suscribir(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

export function useInstalacion() {
  // En el server "instalada": no se muestra nada hasta saberlo en el cliente.
  const estado = useSyncExternalStore(suscribir, leer, () => "instalada" as const);

  async function instalarNativo(): Promise<void> {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    evento = null; // el evento sirve para un solo prompt
    avisar();
  }

  return { estado, instalarNativo };
}
