import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeviceKind, DeviceProtocol } from "@prisma/client";
import mqtt from "mqtt";
import { DevicesService } from "./devices.service";
import { DiscoverZigbee2MqttDto, ImportZigbee2MqttDto } from "./dto/zigbee2mqtt-import.dto";
import { CreateDeviceDto } from "./dto/create-device.dto";

const DISCOVER_TIMEOUT_MS = 6000;

/** Expone acciones (state on/off, brightness, etc): son las senales que Zigbee2MQTT usa para "encender/apagar". */
const ACTIONABLE_EXPOSE_PROPERTIES = new Set(["state"]);
/** Lecturas de solo-sensor: si un dispositivo expone alguna de estas y ninguna accionable, es un sensor puro. */
const SENSOR_EXPOSE_PROPERTIES = new Set(["temperature", "humidity", "battery", "voltage", "linkquality"]);

export interface DiscoveredZigbeeDevice {
  friendlyName: string;
  name: string;
  model?: string;
  ieeeAddress?: string;
  kind: DeviceKind;
}

interface Zigbee2MqttExpose {
  type?: string;
  property?: string;
  features?: { property?: string }[];
}

interface Zigbee2MqttDeviceEntry {
  friendly_name: string;
  ieee_address?: string;
  type?: string;
  definition?: { model?: string; description?: string; exposes?: Zigbee2MqttExpose[] } | null;
}

/** Junta las properties expuestas directamente y las anidadas en composite/light/switch (features). */
function exposedProperties(entry: Zigbee2MqttDeviceEntry): Set<string> {
  const props = new Set<string>();
  for (const expose of entry.definition?.exposes ?? []) {
    if (expose.property) props.add(expose.property);
    for (const feature of expose.features ?? []) {
      if (feature.property) props.add(feature.property);
    }
  }
  return props;
}

/** Sin "state" (ni nada accionable) pero con al menos una lectura conocida -> es un sensor puro, no un switch. */
function inferZigbeeKind(entry: Zigbee2MqttDeviceEntry): DeviceKind {
  const props = exposedProperties(entry);
  const hasAction = [...props].some((p) => ACTIONABLE_EXPOSE_PROPERTIES.has(p));
  const hasSensorReading = [...props].some((p) => SENSOR_EXPOSE_PROPERTIES.has(p));
  return !hasAction && hasSensorReading ? DeviceKind.sensor : DeviceKind.switch;
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
        kind: inferZigbeeKind(e),
      }));
  }

  async import(dto: ImportZigbee2MqttDto) {
    const baseTopic = dto.baseTopic || "zigbee2mqtt";
    const created: unknown[] = [];
    const failed: { friendlyName: string; error: string }[] = [];

    // Se reconsulta la lista del bridge para saber, por dispositivo, si expone "state" (switch)
    // o solo lecturas (sensor) - los datos de exposes no viajan en dto.entities (solo friendlyName/name).
    let kindByFriendlyName = new Map<string, DeviceKind>();
    try {
      const entries = await this.fetchDeviceList(dto, baseTopic);
      kindByFriendlyName = new Map(entries.map((e) => [e.friendly_name, inferZigbeeKind(e)]));
    } catch (err) {
      this.logger.warn(
        `No se pudo reconsultar "${baseTopic}/bridge/devices" para detectar sensores; se asumira switch para todos: ${(err as Error).message}`,
      );
    }

    for (const entity of dto.entities) {
      const kind = kindByFriendlyName.get(entity.friendlyName) ?? DeviceKind.switch;
      const createDto: CreateDeviceDto =
        kind === DeviceKind.sensor
          ? {
              name: entity.name?.trim() || entity.friendlyName,
              protocol: DeviceProtocol.mqtt,
              kind: DeviceKind.sensor,
              stateTopic: `${baseTopic}/${entity.friendlyName}`,
            }
          : {
              name: entity.name?.trim() || entity.friendlyName,
              protocol: DeviceProtocol.mqtt,
              kind: DeviceKind.switch,
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
