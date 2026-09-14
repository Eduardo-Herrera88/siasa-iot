import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawKey: string | undefined = request.headers?.["x-api-key"];

    if (!rawKey) {
      throw new UnauthorizedException("API key requerida");
    }

    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.prisma.apiKey.findUnique({ where: { keyHash } });

    if (!apiKey || apiKey.revokedAt) {
      throw new UnauthorizedException("API key invalida o revocada");
    }

    request.user = {
      id: apiKey.id,
      username: `apikey:${apiKey.name}`,
      role: apiKey.role,
      authType: "apikey",
    };

    this.prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return true;
  }
}
