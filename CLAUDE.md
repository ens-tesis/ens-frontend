@AGENTS.md

# ens-frontend

Frontend del piloto ENS (Next.js App Router + TypeScript + Tailwind v4 + TanStack Query + Axios + Service Worker propio). Alcance completo del proyecto en [ens-infra/docs/CLAUDE.md](https://github.com/ens-tesis/ens-infra/blob/main/docs/CLAUDE.md).

## Estado actual (2026-11-25, `main`)

- Desplegado en Vercel (`ens-frontend-xi.vercel.app`); un push a `main` despliega. La URL del backend se lee en runtime desde el Edge Config (`/api/config`, ítem `backendUrl`): cambiar el túnel no requiere redeploy.
- Rutas: un panel por rol con una subdirección por sección — `/admin/{inicio,crear-colegio,colegios,auditoria}`, `/director/{metricas,asistencia,historial,cursos,alta,usuarios,importar-sie}`, `/preceptor/{metricas,asistencia,historial,mis-cursos,cursos,alta-docentes}`, `/docente/{clase,alumnos,registro,sitios,asistencia}`, más `/alumno`, `/login`, `/cambiar-password`. No hay auto-registro.
- Estructura: `src/app/` solo rutas (cada rol tiene `layout.tsx` con guard y menú vía `PanelRol`; el de `/docente` mantiene la clase en vivo entre secciones). `src/features/` por dominio (`auth`, `panel`, `colegios`, `cursos`, `usuarios`, `reportes`, `seguimiento`, `auditoria`, `notificaciones`, `sesiones-docente`, `sesiones-alumno`), cada una con `components/`, `hooks/`, `lib/`, `index.ts`; entre features se importa solo por `index.ts`. `src/shared/` UI y utilidades sin dominio.
- PWA: `public/sw.js` (caché offline, Background Sync de los eventos sin conexión, Web Push), Wake Lock en la página, estado de la clase en Redux Toolkit con `redux-persist` cifrado (AES-GCM, clave no extraíble en IndexedDB).
- WebSocket (`src/shared/hooks/useSesionSocket.ts`): reintenta con backoff exponencial (1 s → 30 s) y **al instante cuando el navegador avisa `online`**; no pierde la whitelist ni los participantes mientras reintenta. `AlumnoView` reporta foco (`visibilitychange`) y geometría.
- Alertas: campana con abiertas y resueltas; las resueltas se pueden ocultar una por una o todas (no se borran). Banner rojo para desconectados.
- Identidad visual propia: paleta fija de 5 colores como tokens Tailwind v4 (`@theme` en `src/app/globals.css`), contraste WCAG verificado.
- Tests: `npm test` (`*.selfcheck.ts`); CI corre lint, build y tests. Ejecutar `next typegen` antes de `tsc` si los tipos de rutas faltan.
- Sin ver todavía en celular real: el botón de ocultar alertas, la reconexión por `online` y Web Push con la app cerrada.

Historial de decisiones y problemas: [ens-infra/docs/historial/](https://github.com/ens-tesis/ens-infra/tree/main/docs/historial).
