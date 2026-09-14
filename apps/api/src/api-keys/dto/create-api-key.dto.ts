import { IsEnum, IsString, MinLength } from "class-validator";
import { Role } from "@prisma/client";

export class CreateApiKeyDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsEnum(Role)
  role!: Role;
}
