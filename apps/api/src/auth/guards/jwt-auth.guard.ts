import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { AccessTokenPayload } from "../auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    const match = authHeader?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      throw new UnauthorizedException("Token requerido");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        match[1],
        { secret: this.configService.get<string>("JWT_ACCESS_SECRET") },
      );
      request.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Token invalido o expirado");
    }
  }
}
