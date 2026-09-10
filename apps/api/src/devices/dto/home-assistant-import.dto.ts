import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";

export class DiscoverHomeAssistantDto {
  @IsString()
  @MinLength(1)
  baseUrl!: string;

  @IsString()
  @MinLength(1)
  token!: string;

  /** Dominios de entidad a listar, ej. ["switch","light"]. Por defecto: switch, light, fan, input_boolean. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];
}

export class HomeAssistantEntityDto {
  @IsString()
  entityId!: string;

  @IsString()
  name!: string;
}

export class ImportHomeAssistantDto {
  @IsString()
  @MinLength(1)
  baseUrl!: string;

  @IsString()
  @MinLength(1)
  token!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HomeAssistantEntityDto)
  entities!: HomeAssistantEntityDto[];
}
