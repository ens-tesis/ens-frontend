"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { escucharErroresGlobales } from "../lib/reportarErrores";
import { crearStore } from "../store/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [{ store, persistor }] = useState(crearStore);

  // En todas las pantallas (no solo las que usan notificaciones): sin
  // Service Worker el navegador no ofrece instalar la app.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      // Lo que esta página cargó antes de que el SW tomara el control no
      // pasó por él: se lo pasa para que quede en caché offline (sw.js).
      void navigator.serviceWorker.ready.then((reg) =>
        reg.active?.postMessage({
          type: "cachear",
          urls: [
            location.pathname,
            ...performance.getEntriesByType("resource").map((r) => r.name),
          ],
        }),
      );
    }
  }, []);

  // Errores de JS sin capturar → Auditoría del admin.
  useEffect(escucharErroresGlobales, []);

  return (
    <Provider store={store}>
      {/* Hasta descifrar lo persistido (unos ms) no se dibuja nada: si no, la
          vista del alumno creería por un instante que no hay clase. */}
      <PersistGate persistor={persistor} loading={null}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}
