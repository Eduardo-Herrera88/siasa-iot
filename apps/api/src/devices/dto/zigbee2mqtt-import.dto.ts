import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";

export class DiscoverZigbee2MqttDto {
  /** URL del broker MQTT, ej. mqtt://10.3.0.25:1883. Si se omite, usa el broker configurado en el servidor (MQTT_URL). */
  @IsOptional()
  @IsString()
  brokerUrl?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  /** Prefijo base de los topics de Zigbee2MQTT, por defecto "zigbee2mqtt". */
  @IsOptional()
  @IsString()
  baseTopic?: string;
}

export class Zigbee2MqttEntityDto {
  @IsString()
  friendlyName!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class ImportZigbee2MqttDto {
  @IsOptional()
  @IsString()
  brokerUrl?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  baseTopic?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => Zigbee2MqttEntityDto)
  entities!: Zigbee2MqttEntityDto[];
}
