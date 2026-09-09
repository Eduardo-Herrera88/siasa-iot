import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { CommandStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AdapterRegistry } from "../adapters/adapter-registry.service";
import { EventLogService } from "../events/event-log.service";
import { COMMANDS_QUEUE } from "./devices.constants";

interface DispatchJobData {
  commandId: string;
}

@Processor(COMMANDS_QUEUE)
export class CommandsProcessor extends WorkerHost {
  private readonly logger = new Logger("CommandsProcessor");

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterRegistry: AdapterRegistry,
    private readonly eventLog: EventLogService,
  ) {
    super();
  }

  async process(job: Job<DispatchJobData>): Promise<void> {
    const command = await this.prisma.command.findUnique({
      where: { id: job.data.commandId },
      include: { device: true },
    });

    if (!command) {
      this.logger.warn(`Comando ${job.data.commandId} ya no existe`);
      return;
    }

    try {
      const adapter = this.adapterRegistry.resolve(command.device.protocol);
      await adapter.publishCommand(command.device, command.action);

      await this.prisma.command.update({
        where: { id: command.id },
        data: { status: CommandStatus.sent },
      });

      await this.eventLog.log({
        type: "device.command.sent",
        message: `Comando "${command.action}" enviado a "${command.device.name}"`,
        deviceId: command.deviceId,
        userId: command.requestedBy ?? undefined,
      });
    } catch (err) {
      const message = (err as Error).message;

      await this.prisma.command.update({
        where: { id: command.id },
        data: { status: CommandStatus.failed, error: message },
      });

      await this.eventLog.log({
        type: "device.command.failed",
        message: `Fallo el comando "${command.action}" para "${command.device.name}": ${message}`,
        deviceId: command.deviceId,
        userId: command.requestedBy ?? undefined,
      });

      throw err;
    }
  }
}
