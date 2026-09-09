import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { DeviceProtocol } from "@prisma/client";

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

  @IsOptional()
  @IsString()
  httpBaseUrl?: string;
}
