import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ApiKeyAuthGuard } from "./api-key-auth.guard";

/**
 * Acepta un Bearer JWT (sesion de usuario en el frontend) o un header
 * x-api-key (consumo externo/maquina-a-maquina) indistintamente. Ambos
 * caminos dejan `request.user` con la misma forma (AuthenticatedUser),
 * asi que RolesGuard/@Roles funcionan igual sin importar cual se uso.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly apiKeyAuthGuard: ApiKeyAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const hasApiKey = Boolean(request.headers?.["x-api-key"]);

    if (hasApiKey) {
      return this.apiKeyAuthGuard.canActivate(context) as Promise<boolean>;
    }

    if (request.headers?.authorization) {
      return this.jwtAuthGuard.canActivate(context) as Promise<boolean>;
    }

    throw new UnauthorizedException("Token o API key requerida");
  }
}
