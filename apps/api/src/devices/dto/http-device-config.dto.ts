import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
}

export class HttpActionTemplateDto {
  @IsEnum(HttpMethod)
  method!: HttpMethod;

  /** Ruta relativa a httpBaseUrl, ej. "/cm?cmnd=Power%20On" o "/relay/0?turn=on" */
  @IsString()
  path!: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  body?: unknown;
}

/**
 * Configuracion generica de un dispositivo HTTP (Tasmota, Shelly, ESPHome, cualquier REST).
 * Se guarda tal cual en Device.metadata.http. No requiere codigo nuevo por marca.
 */
export class HttpDeviceConfigDto {
  @ValidateNested()
  @Type(() => HttpActionTemplateDto)
  on!: HttpActionTemplateDto;

  @ValidateNested()
  @Type(() => HttpActionTemplateDto)
  off!: HttpActionTemplateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => HttpActionTemplateDto)
  state?: HttpActionTemplateDto;

  /** Cada cuanto hacer polling de `state` (ms). Requiere `state` definido. */
  @IsOptional()
  @IsInt()
  @Min(1000)
  pollIntervalMs?: number;

  /**
   * Ruta tipo "Power" o "relays.0.ison" dentro del JSON de respuesta de `state`. Si se omite,
   * se usa el cuerpo completo como texto plano. El valor extraido se compara contra
   * Device.payloadOn / Device.payloadOff (igual que el adaptador MQTT) para mapearlo a "on"/"off".
   */
  @IsOptional()
  @IsString()
  stateJsonPath?: string;
}
