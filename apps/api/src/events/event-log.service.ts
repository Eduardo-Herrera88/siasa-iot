import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface LogEventInput {
  type: string;
  message: string;
  deviceId?: string;
  userId?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class EventLogService {
  private readonly logger = new Logger("EventLog");

  constructor(private readonly prisma: PrismaService) {}

  async log(input: LogEventInput) {
    this.logger.log(`[${input.type}] ${input.message}`);
    return this.prisma.eventLog.create({
      data: {
        type: input.type,
        message: input.message,
        deviceId: input.deviceId,
        userId: input.userId,
        payload: input.payload as any,
      },
    });
  }
}
