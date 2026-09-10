import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { DeviceProtocol } from "@prisma/client";
import { DevicesService } from "./devices.service";
import { DiscoverHomeAssistantDto, ImportHomeAssistantDto } from "./dto/home-assistant-import.dto";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { HttpMethod } from "./dto/http-device-config.dto";

const DEFAULT_DOMAINS = ["switch", "light", "fan", "input_boolean"];

export interface DiscoveredEntity {
  entityId: string;
  name: string;
  domain: string;
  state: string;
}

interface HaState {
  entity_id: string;
  state: string;
  attributes?: { friendly_name?: string };
}

/**
 * Trae la lista de entidades controlables desde una instancia de Home Assistant y crea
 * dispositivos en SIASA IoT apuntando a su API REST (protocolo http), usando el mismo
 * adaptador HTTP generico ya existente. Evita tener que dar de alta cada entidad a mano.
 */
@Injectable()
export class HomeAssistantImportService {
  private readonly logger = new Logger("HomeAssistantImport");

  constructor(private readonly devicesService: DevicesService) {}

  async discover(dto: DiscoverHomeAssistantDto): Promise<DiscoveredEntity[]> {
    const domains = new Set(dto.domains?.length ? dto.domains : DEFAULT_DOMAINS);
    const states = await this.fetchStates(dto.baseUrl, dto.token);

    return states
      .filter((s) => domains.has(s.entity_id.split(".")[0]))
      .map((s) => ({
        entityId: s.entity_id,
        name: s.attributes?.friendly_name || s.entity_id,
        domain: s.entity_id.split(".")[0],
        state: s.state,
      }));
  }

  async import(dto: ImportHomeAssistantDto) {
    const created: unknown[] = [];
    const failed: { entityId: string; error: string }[] = [];

    for (const entity of dto.entities) {
      const domain = entity.entityId.split(".")[0];
      const groupKey = this.deriveGroupKey(entity.entityId);
      const createDto: CreateDeviceDto = {
        name: entity.name,
        protocol: DeviceProtocol.http,
        payloadOn: "on",
        payloadOff: "off",
        httpBaseUrl: dto.baseUrl,
        group: groupKey ? { key: groupKey, label: entity.name.replace(/\s*\d+$/, "").trim() || entity.name } : undefined,
        httpConfig: {
          on: {
            method: HttpMethod.POST,
            path: `/api/services/${domain}/turn_on`,
            headers: { Authorization: `Bearer ${dto.token}` },
            body: { entity_id: entity.entityId },
          },
          off: {
            method: HttpMethod.POST,
            path: `/api/services/${domain}/turn_off`,
            headers: { Authorization: `Bearer ${dto.token}` },
            body: { entity_id: entity.entityId },
          },
          state: {
            method: HttpMethod.GET,
            path: `/api/states/${entity.entityId}`,
            headers: { Authorization: `Bearer ${dto.token}` },
          },
          pollIntervalMs: 5000,
          stateJsonPath: "state",
        },
      };

      try {
        created.push(await this.devicesService.create(createDto));
      } catch (err) {
        this.logger.warn(`No se pudo importar "${entity.entityId}": ${(err as Error).message}`);
        failed.push({ entityId: entity.entityId, error: (err as Error).message });
      }
    }

    return { created, failed };
  }

  /**
   * Detecta si la entidad es un canal de un dispositivo multi-canal (ej. "switch.sonoff_100226c07a_1",
   * "..._2", "..._3" son 3 salidas del mismo switch fisico) para poder agruparlas en una sola tarjeta.
   * Entidades sin sufijo numerico (dispositivos de un solo canal) no se agrupan.
   */
  private deriveGroupKey(entityId: string): string | undefined {
    const withoutDomain = entityId.split(".")[1] ?? entityId;
    const match = withoutDomain.match(/^(.+)_\d+$/);
    return match ? match[1] : undefined;
  }

  private async fetchStates(baseUrl: string, token: string): Promise<HaState[]> {
    const url = new URL("/api/states", baseUrl).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new BadRequestException(
          `Home Assistant respondio ${response.status} al listar entidades. Revisa la URL y el token.`,
        );
      }
      return (await response.json()) as HaState[];
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`No se pudo conectar a Home Assistant: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
