import { IsOptional, IsString, MinLength } from "class-validator";

/**
 * Agrupa varios dispositivos (ej. los 3 canales de un mismo switch fisico) bajo una
 * sola tarjeta en el dashboard. `key` debe ser igual entre los dispositivos del mismo grupo.
 */
export class DeviceGroupDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsOptional()
  @IsString()
  label?: string;
}
