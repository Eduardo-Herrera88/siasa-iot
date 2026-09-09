import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Version } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AutomationsService } from "./automations.service";
import { CreateAutomationRuleDto } from "./dto/create-automation-rule.dto";
import { UpdateAutomationRuleDto } from "./dto/update-automation-rule.dto";

@Controller("automations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Version("1")
  @Get()
  findAll() {
    return this.automationsService.findAll();
  }

  @Version("1")
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.automationsService.findOne(id);
  }

  @Version("1")
  @Get(":id/executions")
  findExecutions(@Param("id") id: string) {
    return this.automationsService.findExecutions(id);
  }

  @Version("1")
  @Roles(Role.admin, Role.operator)
  @Post()
  create(@Body() dto: CreateAutomationRuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.automationsService.create(dto, user.id);
  }

  @Version("1")
  @Roles(Role.admin, Role.operator)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAutomationRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.automationsService.update(id, dto, user.id);
  }

  @Version("1")
  @Roles(Role.admin)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.automationsService.remove(id, user.id);
  }
}
