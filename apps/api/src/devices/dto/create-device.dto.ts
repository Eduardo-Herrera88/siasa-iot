import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, MinLength, ValidateIf, ValidateNested } from "class-validator";
import { DeviceProtocol } from "@prisma/client";
import { HttpDeviceConfigDto } from "./http-device-config.dto";
import { DeviceGroupDto } from "./device-group.dto";

export class CreateDeviceDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(DeviceProtocol)
  protocol!: DeviceProtocol;

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

  @ValidateIf((dto: CreateDeviceDto) => dto.protocol === DeviceProtocol.http)
  @IsString()
  @MinLength(1)
  httpBaseUrl?: string;

  /** Requerido cuando protocol = http: define como se enciende/apaga/lee el estado del dispositivo. */
  @ValidateIf((dto: CreateDeviceDto) => dto.protocol === DeviceProtocol.http)
  @ValidateNested()
  @Type(() => HttpDeviceConfigDto)
  httpConfig?: HttpDeviceConfigDto;

  /** Si se envia, este dispositivo se muestra agrupado con otros que compartan el mismo group.key. */
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceGroupDto)
  group?: DeviceGroupDto;
}
