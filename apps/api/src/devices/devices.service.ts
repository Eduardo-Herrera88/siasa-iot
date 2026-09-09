import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { CommandAction, CommandStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AdapterRegistry } from "../adapters/adapter-registry.service";
import { EventLogService } from "../events/event-log.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { COMMANDS_QUEUE } from "./devices.constants";

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterRegistry: AdapterRegistry,
    private readonly eventLog: EventLogService,
    @InjectQueue(COMMANDS_QUEUE) private readonly commandsQueue: Queue,
  ) {}

  findAll() {
    return this.prisma.device.findMany({
      include: { state: true },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { state: true },
    });
    if (!device) {
      throw new NotFoundException("Dispositivo no encontrado");
    }
    return device;
  }

  async create(dto: CreateDeviceDto) {
    const device = await this.prisma.device.create({
      data: {
        name: dto.name,
        protocol: dto.protocol,
        commandTopic: dto.commandTopic,
        stateTopic: dto.stateTopic,
        payloadOn: dto.payloadOn ?? "ON",
        payloadOff: dto.payloadOff ?? "OFF",
        httpBaseUrl: dto.httpBaseUrl,
      },
    });

    await this.adapterRegistry.resolve(device.protocol).onDeviceRegistered(device);
    await this.eventLog.log({
      type: "device.registered",
      message: `Dispositivo "${device.name}" registrado (${device.protocol})`,
      deviceId: device.id,
    });

    return device;
  }

  /** Encola el comando; el CommandsProcessor lo despacha al adaptador correspondiente de forma asincrona con reintentos. */
  async sendCommand(deviceId: string, action: CommandAction, userId?: string) {
    const device = await this.findOne(deviceId);

    const command = await this.prisma.command.create({
      data: {
        deviceId: device.id,
        action,
        status: CommandStatus.pending,
        requestedBy: userId,
      },
    });

    await this.commandsQueue.add(
      "dispatch",
      { commandId: command.id },
      { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
    );

    return command;
  }
}
