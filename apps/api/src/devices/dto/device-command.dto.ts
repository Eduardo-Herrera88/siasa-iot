import { IsEnum } from "class-validator";
import { CommandAction } from "@prisma/client";

export class DeviceCommandDto {
  @IsEnum(CommandAction)
  action!: CommandAction;
}
