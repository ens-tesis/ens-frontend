"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

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

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
