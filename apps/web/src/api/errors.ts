import axios from "axios";

/** Extrae el mensaje real que manda el backend (AllExceptionsFilter) en vez del generico "Request failed with status code 400" de axios. */
export function extractErrorMessage(err: unknown, fallback = "Ocurrio un error inesperado."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: unknown } | undefined;
    const raw = data?.message;
    if (typeof raw === "string") return raw;
    if (raw && typeof raw === "object" && "message" in raw && typeof (raw as { message: unknown }).message === "string") {
      return (raw as { message: string }).message;
    }
    if (!err.response) return "No se pudo conectar con el servidor.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
