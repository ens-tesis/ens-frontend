@AGENTS.md

# ens-frontend

Frontend del piloto ENS (Next.js App Router + TypeScript + Tailwind v4 + TanStack Query + Axios). Ver el alcance completo del proyecto en [ens-infra/docs/CLAUDE.md](https://github.com/ens-tesis/ens-infra/blob/main/docs/CLAUDE.md).

## Estado actual (2026-09-14)

- Pantallas reales conectadas al backend real: `/login`, `/docente` (crear sesión, gestionar whitelist, participantes en vivo), `/alumno` (unirse por código, whitelist en vivo vía WebSocket).
- Identidad visual propia: paleta fija de 5 colores como tokens Tailwind v4 (`@theme` en `src/app/globals.css`), contraste WCAG verificado.
- Flujo completo (login → crear sesión → agregar whitelist → alumno se une → update en tiempo real) verificado end-to-end en navegador real.
- CI (lint + build) en verde. Deployado en Vercel: `ens-frontend-xi.vercel.app`.
- Usuarios de prueba: `docente@gmail.com` / `alumno@gmail.com`, password `1234`.
- Pendiente más urgente: reconexión automática de WebSocket (no implementada — ver historial).

Historial detallado de cómo se llegó a este estado (decisiones, problemas resueltos, próximos pasos): [ens-infra/docs/historial/2026-09-14.md](https://github.com/ens-tesis/ens-infra/blob/main/docs/historial/2026-09-14.md)
