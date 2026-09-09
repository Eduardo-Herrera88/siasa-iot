import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { CommandAction } from "@prisma/client";

export class RuleActionDto {
  @IsString()
  deviceId!: string;

  @IsEnum(CommandAction)
  action!: CommandAction;

  @IsOptional()
  @IsInt()
  @Min(0)
  delayMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
