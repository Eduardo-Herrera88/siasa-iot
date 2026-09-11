import { IsOptional, IsString } from "class-validator";

/**
 * Soporte opcional para brokers MQTT que publican JSON en vez de texto plano (ej. Zigbee2MQTT,
 * que publica {"state":"ON"} en vez de "ON"). Si se omite, el dispositivo se comporta igual que
 * siempre (payload de texto plano comparado contra payloadOn/payloadOff) - no rompe nada existente.
 */
export class MqttJsonConfigDto {
  /** Ruta dentro del JSON de estado recibido, ej. "state" o "occupancy". */
  @IsOptional()
  @IsString()
  statePath?: string;

  /** Cuerpo JSON a publicar al encender, ej. {"state":"ON"}. */
  @IsOptional()
  onPayload?: unknown;

  /** Cuerpo JSON a publicar al apagar, ej. {"state":"OFF"}. */
  @IsOptional()
  offPayload?: unknown;
}
