import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeviceProtocol } from "@prisma/client";
import mqtt from "mqtt";
import { DevicesService } from "./devices.service";
import { DiscoverZigbee2MqttDto, ImportZigbee2MqttDto } from "./dto/zigbee2mqtt-import.dto";
import { CreateDeviceDto } from "./dto/create-device.dto";

const DISCOVER_TIMEOUT_MS = 6000;

export interface DiscoveredZigbeeDevice {
  friendlyName: string;
  name: string;
  model?: string;
  ieeeAddress?: string;
}

interface Zigbee2MqttDeviceEntry {
  friendly_name: string;
  ieee_address?: string;
  type?: string;
  definition?: { model?: string; description?: string } | null;
}

/**
 * Descubre e importa dispositivos publicados por Zigbee2MQTT (o cualquier otro puente MQTT que
 * siga el mismo patron: <baseTopic>/bridge/devices con la lista, <baseTopic>/<friendly_name> para
 * estado, <baseTopic>/<friendly_name>/set para comandos). No pasa por Home Assistant en ningun
 * momento: habla directo al broker MQTT usando el mismo adaptador MQTT generico ya existente
 * (extendido con soporte de payloads JSON via Device.metadata.mqttJson).
 */
@Injectable()
export class Zigbee2MqttImportService {
  private readonly logger = new Logger("Zigbee2MqttImport");

  constructor(
    private readonly devicesService: DevicesService,
    private readonly configService: ConfigService,
  ) {}

  async discover(dto: DiscoverZigbee2MqttDto): Promise<DiscoveredZigbeeDevice[]> {
    const baseTopic = dto.baseTopic || "zigbee2mqtt";
    const entries = await this.fetchDeviceList(dto, baseTopic);

    return entries
      .filter((e) => e.type !== "Coordinator" && e.friendly_name)
      .map((e) => ({
        friendlyName: e.friendly_name,
        name: e.friendly_name,
        model: e.definition?.model ?? undefined,
        ieeeAddress: e.ieee_address,
      }));
  }

  async import(dto: ImportZigbee2MqttDto) {
    const baseTopic = dto.baseTopic || "zigbee2mqtt";
    const created: unknown[] = [];
    const failed: { friendlyName: string; error: string }[] = [];

    for (const entity of dto.entities) {
      const createDto: CreateDeviceDto = {
        name: entity.name?.trim() || entity.friendlyName,
        protocol: DeviceProtocol.mqtt,
        payloadOn: "ON",
        payloadOff: "OFF",
        stateTopic: `${baseTopic}/${entity.friendlyName}`,
        commandTopic: `${baseTopic}/${entity.friendlyName}/set`,
        mqttJson: {
          statePath: "state",
          onPayload: { state: "ON" },
          offPayload: { state: "OFF" },
        },
      };

      try {
        created.push(await this.devicesService.create(createDto));
      } catch (err) {
        this.logger.warn(`No se pudo importar "${entity.friendlyName}": ${(err as Error).message}`);
        failed.push({ friendlyName: entity.friendlyName, error: (err as Error).message });
      }
    }

    return { created, failed };
  }

  private fetchDeviceList(
    dto: DiscoverZigbee2MqttDto,
    baseTopic: string,
  ): Promise<Zigbee2MqttDeviceEntry[]> {
    const url = dto.brokerUrl || this.configService.get<string>("MQTT_URL", "mqtt://localhost:1883");
    const username = dto.username || this.configService.get<string>("MQTT_USERNAME") || undefined;
    const password = dto.password || this.configService.get<string>("MQTT_PASSWORD") || undefined;

    return new Promise((resolve, reject) => {
      const client = mqtt.connect(url, { username, password, connectTimeout: DISCOVER_TIMEOUT_MS });
      const topic = `${baseTopic}/bridge/devices`;
      let settled = false;

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        client.end(true);
        fn();
      };

      const timer = setTimeout(() => {
        finish(() =>
          reject(
            new BadRequestException(
              `No se recibio respuesta de "${topic}" en ${DISCOVER_TIMEOUT_MS}ms. Verifica el broker y que Zigbee2MQTT este publicando.`,
            ),
          ),
        );
      }, DISCOVER_TIMEOUT_MS);

      client.on("error", (err) => {
        finish(() => reject(new BadRequestException(`No se pudo conectar al broker MQTT: ${err.message}`)));
      });

      client.on("connect", () => {
        client.subscribe(topic, (err) => {
          if (err) {
            finish(() => reject(new BadRequestException(`No se pudo suscribir a "${topic}": ${err.message}`)));
          }
        });
      });

      client.on("message", (receivedTopic, payload) => {
        if (receivedTopic !== topic) return;
        try {
          const devices = JSON.parse(payload.toString()) as Zigbee2MqttDeviceEntry[];
          finish(() => resolve(devices));
        } catch (err) {
          finish(() => reject(new BadRequestException(`Respuesta invalida en "${topic}": ${(err as Error).message}`)));
        }
      });
    });
  }
}
