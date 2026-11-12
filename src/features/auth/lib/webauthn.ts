import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { api } from "@/shared/api/client";
import type { Usuario } from "./session";

// Ingreso con huella / passkey (solo alumnos, Anexo B.2). La ceremonia la
// hace el navegador con el sensor del celular; el backend solo ve firmas.

export const soportaHuella = (): boolean => typeof window !== "undefined" && browserSupportsWebAuthn();

// Para ofrecer ACTIVAR la huella no alcanza con que el navegador soporte
// WebAuthn: este dispositivo tiene que tener su propio sensor o bloqueo de
// pantalla (el backend solo acepta la huella del mismo dispositivo). Una PC
// sin lector no muestra la invitación en vez de ofrecer algo que va a fallar.
export const tieneSensorPropio = (): Promise<boolean> =>
  soportaHuella() ? platformAuthenticatorIsAvailable() : Promise.resolve(false);

// Identificador de este navegador/celular: se registra junto con la huella
// y viaja en cada ingreso. Si el backend recibe otro (o ninguno), avisa al
// docente que el alumno entró desde un dispositivo que no es el registrado.
const CLAVE_DISPOSITIVO = "ens_dispositivo";
function idDispositivo(): string | undefined {
  try {
    let id = localStorage.getItem(CLAVE_DISPOSITIVO);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLAVE_DISPOSITIVO, id);
    }
    return id;
  } catch {
    return undefined; // sin almacenamiento (modo privado estricto)
  }
}

export async function ingresarConHuella(): Promise<{ token: string; refreshToken: string; usuario: Usuario }> {
  const { data: optionsJSON } = await api.post<PublicKeyCredentialRequestOptionsJSON>("/auth/webauthn/ingreso/opciones");
  const respuesta = await startAuthentication({ optionsJSON });
  const { data } = await api.post<{ token: string; refreshToken: string; usuario: Usuario }>("/auth/webauthn/ingreso/verificar", {
    respuesta,
    dispositivo: idDispositivo(),
  });
  return data;
}

export async function registrarHuella(): Promise<void> {
  const { data: optionsJSON } = await api.post<PublicKeyCredentialCreationOptionsJSON>("/auth/webauthn/registro/opciones");
  const respuesta = await startRegistration({ optionsJSON });
  await api.post("/auth/webauthn/registro/verificar", { respuesta, dispositivo: idDispositivo() });
}

// El usuario cerró el diálogo del sistema o no puso el dedo: no es un error
// para mostrar en rojo.
export function fueCancelado(err: unknown): boolean {
  return err instanceof Error && (err.name === "NotAllowedError" || err.name === "AbortError");
}
