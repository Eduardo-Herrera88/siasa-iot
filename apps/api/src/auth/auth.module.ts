import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { ApiKeyAuthGuard } from "./guards/api-key-auth.guard";
import { AuthGuard } from "./guards/auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [JwtModule.register({}), EventsModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, ApiKeyAuthGuard, AuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, ApiKeyAuthGuard, AuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
