import type { Rol } from "./session";

// Espejo del mismo orden que usa el backend para autorizar POST
// /admin/usuarios (ver ens-backend modules/auth/model/rolJerarquia.ts) —
// acá solo se usa para limitar las opciones del selector de rol en el
// formulario, la autorización real siempre la hace el backend.
const ORDEN_JERARQUICO: Record<Rol, number> = {
  admin: 5,
  director: 4,
  preceptor: 3,
  docente: 2,
  alumno: 1,
};

// 'alumno' queda afuera: se da de alta solo por registro público. Ver la
// misma nota en el backend (modules/auth/dto/validation.ts,
// crearUsuarioAdminSchema) — sin 'alumno' en este set, un docente no
// tiene ningún rol creable por debajo, coherente con que no puede crear
// a nadie desde este panel.
const ROLES_CREABLES: Rol[] = ["admin", "director", "preceptor", "docente"];

export function rolesInferioresA(rol: Rol): Rol[] {
  const propio = ORDEN_JERARQUICO[rol];
  return ROLES_CREABLES.filter((r) => ORDEN_JERARQUICO[r] < propio);
}

export function puedeCrearUsuarios(rol: Rol): boolean {
  return rolesInferioresA(rol).length > 0;
}
