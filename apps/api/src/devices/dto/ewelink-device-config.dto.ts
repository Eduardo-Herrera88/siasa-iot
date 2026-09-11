import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

/**
 * Configuracion para control LAN directo de un dispositivo eWeLink/Sonoff (sin nube, sin
 * Home Assistant). deviceId y devicekey se obtienen una sola vez de la cuenta eWeLink
 * (ej. desde el almacenamiento local de una integracion existente); despues de eso el
 * control es 100% local por la red, puerto 8081.
 */
export class EwelinkDeviceConfigDto {
  @IsString()
  @MinLength(1)
  deviceId!: string;

  /** Clave AES local del dispositivo (no es la contraseña de la cuenta ni el apikey de cuenta). */
  @IsString()
  @MinLength(1)
  devicekey!: string;

  /** IP o hostname del dispositivo en la red local. */
  @IsString()
  @MinLength(1)
  host!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  port?: number;

  /** Canal/salida para switches multi-gang (0, 1, 2...). Omitir para dispositivos de un solo canal. */
  @IsOptional()
  @IsInt()
  @Min(0)
  channel?: number;
}
