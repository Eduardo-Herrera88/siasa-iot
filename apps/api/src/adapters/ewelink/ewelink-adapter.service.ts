import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { CommandAction, Device, DeviceProtocol } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DeviceStateBus } from "../../state-bus/device-state-bus.service";
import type { DeviceAdapter } from "../adapter.interface";
import { AdapterRegistry } from "../adapter-registry.service";
import type { EwelinkDeviceConfigDto } from "../../devices/dto/ewelink-device-config.dto";
import { decryptPayload, encryptPayload } from "./ewelink-crypto.util";

interface EwelinkMetadata {
  ewelink?: EwelinkDeviceConfigDto;
}

interface EwelinkInfoResponse {
  error: number;
  data?: string;
  iv?: string;
}

interface EwelinkStatePayload {
  switch?: "on" | "off";
  switches?: { switch: "on" | "off"; outlet: number }[];
}

const POLL_INTERVAL_MS = 8000;
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Control 100% local de dispositivos SONOFF/eWeLink por LAN (puerto 8081), sin pasar por la
 * nube de eWeLink ni por Home Assistant. Protocolo verificado contra el codigo fuente de
 * SonoffLAN: AES-128-CBC con clave MD5(devicekey). La devicekey de cada dispositivo se obtiene
 * una unica vez fuera de este adaptador (ver EwelinkDeviceConfigDto) y se guarda en
 * Device.metadata.ewelink; a partir de ahi no hay ninguna dependencia externa.
 */
@Injectable()
export class EwelinkAdapterService implements DeviceAdapter, OnModuleInit, OnModuleDestroy {
  readonly protocol = DeviceProtocol.ewelink;

  private readonly logger = new Logger("EwelinkAdapter");
  private readonly pollers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateBus: DeviceStateBus,
    private readonly registry: AdapterRegistry,
  ) {}

  async onModuleInit() {
    this.registry.register(this);
    const devices = await this.prisma.device.findMany({ where: { protocol: DeviceProtocol.ewelink } });
    for (const device of devices) this.startPolling(device);
  }

  onModuleDestroy() {
    for (const timer of this.pollers.values()) clearInterval(timer);
    this.pollers.clear();
  }

  onDeviceRegistered(device: Device): void {
    if (device.protocol === DeviceProtocol.ewelink) this.startPolling(device);
  }

  async publishCommand(device: Device, action: CommandAction): Promise<void> {
    const config = this.readConfig(device);
    if (!config) {
      throw new Error(`Dispositivo "${device.name}" no tiene configuracion eWeLink (deviceId/devicekey/host)`);
    }

    const switchValue = action === CommandAction.on ? "on" : "off";
    const path = config.channel !== undefined ? "switches" : "switch";
    const payload =
      config.channel !== undefined
        ? { switches: [{ switch: switchValue, outlet: config.channel }] }
        : { switch: switchValue };

    await this.request(config, path, payload);
  }

  private startPolling(device: Device) {
    const config = this.readConfig(device);
    if (!config) return;

    this.stopPolling(device.id);
    const poll = async () => {
      try {
        const state = await this.request<EwelinkStatePayload>(config, "info", {});
        const switchValue =
          config.channel !== undefined
            ? state.switches?.find((s) => s.outlet === config.channel)?.switch
            : state.switch;

        if (switchValue) {
          this.stateBus.emit({ deviceId: device.id, state: switchValue, rawPayload: JSON.stringify(state) });
        }
      } catch (err) {
        this.logger.warn(`Fallo el polling LAN de "${device.name}" (${config.host}): ${(err as Error).message}`);
      }
    };

    this.pollers.set(device.id, setInterval(poll, POLL_INTERVAL_MS));
    poll();
  }

  private stopPolling(deviceId: string) {
    const existing = this.pollers.get(deviceId);
    if (existing) clearInterval(existing);
  }

  private readConfig(device: Device): EwelinkDeviceConfigDto | undefined {
    const metadata = device.metadata as EwelinkMetadata | null;
    return metadata?.ewelink;
  }

  private async request<T = EwelinkStatePayload>(
    config: EwelinkDeviceConfigDto,
    command: "info" | "switch" | "switches",
    data: unknown,
  ): Promise<T> {
    const { data: encData, iv } = encryptPayload(config.devicekey, data);
    const body = {
      sequence: Date.now().toString(),
      deviceid: config.deviceId,
      selfApikey: "123",
      data: encData,
      encrypt: true,
      iv,
    };

    const port = config.port ?? 8081;
    const url = `http://${config.host}:${port}/zeroconf/${command}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const json = (await response.json()) as EwelinkInfoResponse;
      if (json.error && json.error !== 0) {
        throw new Error(`Dispositivo respondio error ${json.error}`);
      }
      if (!json.data || !json.iv) {
        return {} as T;
      }
      return decryptPayload<T>(config.devicekey, json.data, json.iv);
    } finally {
      clearTimeout(timeout);
    }
  }
}
