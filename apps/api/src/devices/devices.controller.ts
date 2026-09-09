import { Body, Controller, Get, Param, Post, UseGuards, Version } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { DevicesService } from "./devices.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { DeviceCommandDto } from "./dto/device-command.dto";

@Controller("devices")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Version("1")
  @Get()
  findAll() {
    return this.devicesService.findAll();
  }

  @Version("1")
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.devicesService.findOne(id);
  }

  @Version("1")
  @Roles(Role.admin)
  @Post()
  create(@Body() dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
  }

  @Version("1")
  @Roles(Role.admin, Role.operator)
  @Post(":id/command")
  sendCommand(
    @Param("id") id: string,
    @Body() dto: DeviceCommandDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devicesService.sendCommand(id, dto.action, user.id);
  }
}
