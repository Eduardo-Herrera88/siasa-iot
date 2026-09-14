import { Transform } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";
import { DeviceProtocol } from "@prisma/client";

/**
 * GET /devices?protocol=mqtt o ?protocol=mqtt,ewelink - para pedir solo los dispositivos que NO
 * pasan por Home Assistant (protocol=http en este fleet siempre es via el bridge REST de HA).
 */
export class ListDevicesQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.split(",").map((v) => v.trim()) : value))
  @IsEnum(DeviceProtocol, { each: true })
  protocol?: DeviceProtocol[];
}
