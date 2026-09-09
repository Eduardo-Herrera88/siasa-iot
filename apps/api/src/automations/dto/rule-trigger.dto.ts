import { IsEnum, IsString, MinLength } from "class-validator";
import { ComparisonOperator } from "@prisma/client";

export class RuleTriggerDto {
  @IsString()
  deviceId!: string;

  @IsEnum(ComparisonOperator)
  operator: ComparisonOperator = ComparisonOperator.eq;

  @IsString()
  @MinLength(1)
  value!: string;
}
