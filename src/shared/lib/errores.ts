import axios from "axios";

// Mismo criterio que los extraerMensajeError de cada vista: el mensaje del
// backend si vino uno, si no un texto genérico.
export function mensajeDeError(err: unknown, porDefecto: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return porDefecto;
}
