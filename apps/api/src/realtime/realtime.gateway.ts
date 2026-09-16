import { Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Prisma } from "@prisma/client";
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Subscription } from "rxjs";
import type { Server, WebSocket } from "ws";
import { DeviceStateBus } from "../state-bus/device-state-bus.service";
import { PrismaService } from "../prisma/prisma.service";

@WebSocketGateway({ path: "/ws" })
export class RealtimeGateway implements OnGatewayConnection, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger("RealtimeGateway");
  private subscription?: Subscription;

  constructor(
    private readonly stateBus: DeviceStateBus,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.subscription = this.stateBus.events$.subscribe(async (event) => {
      const readings = event.readings as Prisma.InputJsonValue | undefined;
      await this.prisma.deviceState.upsert({
        where: { deviceId: event.deviceId },
        create: {
          deviceId: event.deviceId,
          state: event.state,
          rawPayload: event.rawPayload,
          readings,
        },
        update: {
          state: event.state,
          rawPayload: event.rawPayload,
          readings,
        },
      });
      this.broadcast({ type: "device.state", ...event });
    });
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
  }

  async handleConnection(client: WebSocket, request: { url?: string }) {
    const token = new URLSearchParams(request.url?.split("?")[1] ?? "").get("token");

    if (!token) {
      client.close(4001, "Token requerido");
      return;
    }

    try {
      await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
      });
    } catch {
      client.close(4001, "Token invalido");
      return;
    }
  }

  private broadcast(message: Record<string, unknown>) {
    const payload = JSON.stringify(message);
    this.server?.clients?.forEach((ws: WebSocket) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    });
  }
}
