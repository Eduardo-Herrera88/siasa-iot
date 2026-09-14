import { Body, Controller, Delete, Get, Param, Post, UseGuards, Version } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ownerUserId, type AuthenticatedUser } from "../auth/auth.types";
import { ApiKeysService } from "./api-keys.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";

@Controller("api-keys")
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.admin)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Version("1")
  @Get()
  findAll() {
    return this.apiKeysService.findAll();
  }

  @Version("1")
  @Post()
  create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.apiKeysService.create(dto, ownerUserId(user));
  }

  @Version("1")
  @Delete(":id")
  revoke(@Param("id") id: string) {
    return this.apiKeysService.revoke(id);
  }
}
