import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";
import { DeviceProtocol } from "@prisma/client";
import { HttpDeviceConfigDto } from "./http-device-config.dto";

/** Actualizacion parcial de un dispositivo. Si se envia httpConfig, reemplaza la configuracion HTTP completa. */
export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(DeviceProtocol)
  protocol?: DeviceProtocol;

  @IsOptional()
  @IsString()
  commandTopic?: string;

  @IsOptional()
  @IsString()
  stateTopic?: string;

  @IsOptional()
  @IsString()
  payloadOn?: string;

  @IsOptional()
  @IsString()
  payloadOff?: string;

  @IsOptional()
  @IsString()
  httpBaseUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => HttpDeviceConfigDto)
  httpConfig?: HttpDeviceConfigDto;
}
