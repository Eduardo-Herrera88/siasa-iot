import { HttpDeviceConfigDto } from "./dto/http-device-config.dto";
import { EwelinkDeviceConfigDto } from "./dto/ewelink-device-config.dto";

export const REDACTED = "••••••••";

const SENSITIVE_HEADER_NAMES = new Set(["authorization", "x-api-key", "api-key", "apikey", "token"]);

function redactHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
  if (!headers) return headers;
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    redacted[key] = SENSITIVE_HEADER_NAMES.has(key.toLowerCase()) ? REDACTED : value;
  }
  return redacted;
}

/**
 * Nunca se debe devolver un secreto (token Bearer de Home Assistant, devicekey AES de eWeLink)
 * en una respuesta de la API - list/get/create/update de dispositivos hasta ahora los exponian
 * en texto plano dentro de metadata.http.*.headers y metadata.ewelink.devicekey a cualquier
 * caller autenticado (cualquier rol, incluida una API key externa). Redacta antes de responder;
 * la config real sigue intacta en la base de datos.
 */
export function sanitizeDeviceMetadata(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== "object") return metadata;
  const meta = { ...(metadata as Record<string, any>) };

  if (meta.http && typeof meta.http === "object") {
    const http = { ...meta.http };
    for (const key of ["on", "off", "state"] as const) {
      if (http[key]) {
        http[key] = { ...http[key], headers: redactHeaders(http[key].headers) };
      }
    }
    meta.http = http;
  }

  if (meta.ewelink && typeof meta.ewelink === "object") {
    meta.ewelink = { ...meta.ewelink, devicekey: REDACTED };
  }

  return meta;
}

export function sanitizeDevice<T extends { metadata: unknown }>(device: T): T {
  return { ...device, metadata: sanitizeDeviceMetadata(device.metadata) };
}

/**
 * Al editar un dispositivo, el frontend/cliente reenvia la config tal como la recibio (ya
 * redactada). Sin esto, guardar cualquier otro cambio (ej. renombrar) pisaria el secreto real
 * en la base de datos con el placeholder "••••••••", dejando el dispositivo sin poder controlarse.
 * Restaura el valor real desde lo ya guardado cuando el valor entrante es el placeholder.
 */
export function restoreRedactedSecrets(
  existingMetadata: unknown,
  incoming: { httpConfig?: HttpDeviceConfigDto; ewelinkConfig?: EwelinkDeviceConfigDto },
): void {
  const existing = (existingMetadata as Record<string, any> | null) ?? {};

  if (incoming.httpConfig) {
    const existingHttp = existing.http ?? {};
    for (const key of ["on", "off", "state"] as const) {
      const incomingAction = (incoming.httpConfig as Record<string, any>)[key];
      const existingHeaders = existingHttp[key]?.headers;
      if (!incomingAction?.headers || !existingHeaders) continue;
      for (const [headerKey, headerValue] of Object.entries(incomingAction.headers)) {
        if (headerValue === REDACTED && existingHeaders[headerKey] !== undefined) {
          incomingAction.headers[headerKey] = existingHeaders[headerKey];
        }
      }
    }
  }

  if (incoming.ewelinkConfig?.devicekey === REDACTED && existing.ewelink?.devicekey) {
    incoming.ewelinkConfig.devicekey = existing.ewelink.devicekey;
  }
}
