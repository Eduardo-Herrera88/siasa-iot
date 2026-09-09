import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandAction, Device, DeviceProtocol } from "@prisma/client";
import mqtt, { MqttClient } from "mqtt";
import { PrismaService } from "../../prisma/prisma.service";
import { DeviceStateBus } from "../../state-bus/device-state-bus.service";
import type { DeviceAdapter } from "../adapter.interface";
import { AdapterRegistry } from "../adapter-registry.service";

@Injectable()
export class MqttAdapterService implements DeviceAdapter, OnModuleInit, OnModuleDestroy {
  readonly protocol = DeviceProtocol.mqtt;

  private readonly logger = new Logger("MqttAdapter");
  private client?: MqttClient;
  private readonly topicToDeviceId = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly stateBus: DeviceStateBus,
    private readonly registry: AdapterRegistry,
  ) {}

  async onModuleInit() {
    this.registry.register(this);

    const url = this.configService.get<string>("MQTT_URL", "mqtt://localhost:1883");
    const username = this.configService.get<string>("MQTT_USERNAME") || undefined;
    const password = this.configService.get<string>("MQTT_PASSWORD") || undefined;

    this.client = mqtt.connect(url, {
      username,
      password,
      reconnectPeriod: 2000,
    });

    this.client.on("connect", async () => {
      this.logger.log(`Conectado a broker MQTT ${url}`);
      await this.resubscribeAll();
    });

    this.client.on("reconnect", () => this.logger.warn("Reconectando a broker MQTT..."));
    this.client.on("error", (err) => this.logger.error(`Error de conexion MQTT: ${err.message}`));

    this.client.on("message", (topic, payload) => this.handleMessage(topic, payload));
  }

  async onModuleDestroy() {
    this.client?.end(true);
  }

  private async resubscribeAll() {
    const devices = await this.prisma.device.findMany({
      where: { protocol: DeviceProtocol.mqtt, stateTopic: { not: null } },
    });
    for (const device of devices) {
      this.subscribeToState(device);
    }
  }

  private subscribeToState(device: Device) {
    if (!device.stateTopic || !this.client) return;
    this.topicToDeviceId.set(device.stateTopic, device.id);
    this.client.subscribe(device.stateTopic, (err) => {
      if (err) {
        this.logger.error(`No se pudo suscribir a ${device.stateTopic}: ${err.message}`);
      } else {
        this.logger.log(`Suscrito a estado de "${device.name}" en topic ${device.stateTopic}`);
      }
    });
  }

  private async handleMessage(topic: string, payload: Buffer) {
    const deviceId = this.topicToDeviceId.get(topic);
    if (!deviceId) return;

    const raw = payload.toString().trim();
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return;

    let state = raw;
    if (raw === device.payloadOn) state = "on";
    else if (raw === device.payloadOff) state = "off";

    this.stateBus.emit({ deviceId, state, rawPayload: raw });
  }

  async publishCommand(device: Device, action: CommandAction): Promise<void> {
    if (!this.client || !device.commandTopic) {
      throw new Error(`Dispositivo "${device.name}" no tiene commandTopic configurado`);
    }

    const payload = action === CommandAction.on ? device.payloadOn : device.payloadOff;

    await new Promise<void>((resolve, reject) => {
      this.client!.publish(device.commandTopic!, payload, { qos: 1 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  onDeviceRegistered(device: Device): void {
    if (device.protocol === DeviceProtocol.mqtt) {
      this.subscribeToState(device);
    }
  }
}
