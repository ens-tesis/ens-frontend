import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { WhitelistUrl } from "../types/sesiones";

// Estado de cliente de la clase en curso (no del servidor: eso es TanStack
// Query). Se persiste cifrado (store.ts): si el wifi del colegio se cae y
// el alumno recarga, o el sistema cierra la PWA, vuelve a su clase con la
// última whitelist recibida hasta que el socket reconecta y el servidor
// manda la vigente (anteproyecto §3.1).
interface ClaseState {
  // Código de la clase a la que está unido el alumno / que dicta el docente.
  codigoAlumno: string | null;
  codigoDocente: string | null;
  // Última whitelist recibida por código de clase.
  whitelists: Record<string, WhitelistUrl[]>;
}

const inicial: ClaseState = { codigoAlumno: null, codigoDocente: null, whitelists: {} };

export const claseSlice = createSlice({
  name: "clase",
  initialState: inicial,
  reducers: {
    setCodigoAlumno(state, action: PayloadAction<string | null>) {
      state.codigoAlumno = action.payload;
    },
    setCodigoDocente(state, action: PayloadAction<string | null>) {
      state.codigoDocente = action.payload;
    },
    // null: la clase terminó, esa whitelist ya no rige.
    guardarWhitelist(state, action: PayloadAction<{ codigo: string; whitelist: WhitelistUrl[] | null }>) {
      const { codigo, whitelist } = action.payload;
      if (whitelist) state.whitelists[codigo] = whitelist;
      else delete state.whitelists[codigo];
    },
    // Cerrar sesión: nada de la clase queda en el dispositivo.
    limpiarClase: () => inicial,
  },
});

export const { setCodigoAlumno, setCodigoDocente, guardarWhitelist, limpiarClase } = claseSlice.actions;
