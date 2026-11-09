import {
  browserSupportsWebAuthn,
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

export async function ingresarConHuella(): Promise<{ token: string; usuario: Usuario }> {
  const { data: optionsJSON } = await api.post<PublicKeyCredentialRequestOptionsJSON>("/auth/webauthn/ingreso/opciones");
  const respuesta = await startAuthentication({ optionsJSON });
  const { data } = await api.post<{ token: string; usuario: Usuario }>("/auth/webauthn/ingreso/verificar", { respuesta });
  return data;
}

export async function registrarHuella(): Promise<void> {
  const { data: optionsJSON } = await api.post<PublicKeyCredentialCreationOptionsJSON>("/auth/webauthn/registro/opciones");
  const respuesta = await startRegistration({ optionsJSON });
  await api.post("/auth/webauthn/registro/verificar", { respuesta });
}

// El usuario cerró el diálogo del sistema o no puso el dedo: no es un error
// para mostrar en rojo.
export function fueCancelado(err: unknown): boolean {
  return err instanceof Error && (err.name === "NotAllowedError" || err.name === "AbortError");
}
