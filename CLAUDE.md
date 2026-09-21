@AGENTS.md

# ens-frontend

Frontend del piloto ENS (Next.js App Router + TypeScript + Tailwind v4 + TanStack Query + Axios). Ver el alcance completo del proyecto en [ens-infra/docs/CLAUDE.md](https://github.com/ens-tesis/ens-infra/blob/main/docs/CLAUDE.md).

## Estado actual (2026-09-16, rama `refactor/arquitectura-modular` — sin mergear a `main`)

- Pantallas reales conectadas al backend real: `/login`, `/docente` (crear sesión, gestionar whitelist, participantes en vivo), `/alumno` (unirse por código, whitelist en vivo vía WebSocket), `/registro` (solo alumno, sin selector de rol), `/admin` (alta de cuentas para admin/director/preceptor, rol limitado a lo que le permite crear su jerarquía).
- Reestructurado a `src/features/{auth,sesiones-docente,sesiones-alumno}/{views,components,queries,services,index.ts}` + `src/shared` (ver historial 2026-09-16-refactor).
- Identidad visual propia: paleta fija de 5 colores como tokens Tailwind v4 (`@theme` en `src/app/globals.css`), contraste WCAG verificado.
- Flujo completo (login → crear sesión → agregar whitelist → alumno se une → update en tiempo real) verificado end-to-end en navegador real.
- Reconexión automática de WebSocket: `useSesionSocket` (`src/shared/hooks/useSesionSocket.ts`) reintenta solo con backoff exponencial (1s → 30s tope, sin límite de intentos) ante una desconexión inesperada, sin perder la whitelist/participantes ya conocidos mientras reintenta.
- CI (lint + build) en verde en `main`. Deployado en Vercel: `ens-frontend-xi.vercel.app` (todavía corriendo el código de `main`, sin el refactor ni los roles hasta que se mergee).
- Usuarios de prueba: `docente@gmail.com` / `alumno@gmail.com`, password `1234`; admin real `equipoens@gmail.com` (contraseña vía `ADMIN_SEED_PASSWORD` al sembrar, no documentada acá).
- Autómata de presencia: `AlumnoView` reporta cambios de foco de pestaña (`visibilitychange`) al backend vía `useSesionSocket().enviarMensaje`; `ParticipantesPanel` muestra los 6 estados de `EstadoPresencia` con etiqueta legible (antes mostraba el enum crudo). El heartbeat en sí es 100% backend (ping/pong nativo de WS, el navegador responde solo) — sin cambios necesarios acá para esa parte.

Historial detallado de cómo se llegó a este estado (decisiones, problemas resueltos, próximos pasos): [ens-infra/docs/historial/2026-09-16-refactor.md](https://github.com/ens-tesis/ens-infra/blob/main/docs/historial/2026-09-16-refactor.md) (reconexión WS: [2026-09-16.md](https://github.com/ens-tesis/ens-infra/blob/main/docs/historial/2026-09-16.md), sesión anterior: [2026-09-14.md](https://github.com/ens-tesis/ens-infra/blob/main/docs/historial/2026-09-14.md))
