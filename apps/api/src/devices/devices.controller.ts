import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Version } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { DevicesService } from "./devices.service";
import { HomeAssistantImportService } from "./home-assistant-import.service";
import { Zigbee2MqttImportService } from "./zigbee2mqtt-import.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";
import { DeviceCommandDto } from "./dto/device-command.dto";
import { DiscoverHomeAssistantDto, ImportHomeAssistantDto } from "./dto/home-assistant-import.dto";
import { DiscoverZigbee2MqttDto, ImportZigbee2MqttDto } from "./dto/zigbee2mqtt-import.dto";

@Controller("devices")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly haImportService: HomeAssistantImportService,
    private readonly zigbee2mqttImportService: Zigbee2MqttImportService,
  ) {}

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
  @Roles(Role.admin)
  @Post("home-assistant/discover")
  discoverHomeAssistant(@Body() dto: DiscoverHomeAssistantDto) {
    return this.haImportService.discover(dto);
  }

  @Version("1")
  @Roles(Role.admin)
  @Post("home-assistant/import")
  importHomeAssistant(@Body() dto: ImportHomeAssistantDto) {
    return this.haImportService.import(dto);
  }

  @Version("1")
  @Roles(Role.admin)
  @Post("zigbee2mqtt/discover")
  discoverZigbee2Mqtt(@Body() dto: DiscoverZigbee2MqttDto) {
    return this.zigbee2mqttImportService.discover(dto);
  }

  @Version("1")
  @Roles(Role.admin)
  @Post("zigbee2mqtt/import")
  importZigbee2Mqtt(@Body() dto: ImportZigbee2MqttDto) {
    return this.zigbee2mqttImportService.import(dto);
  }

  @Version("1")
  @Roles(Role.admin)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDeviceDto) {
    return this.devicesService.update(id, dto);
  }

  @Version("1")
  @Roles(Role.admin)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.devicesService.remove(id);
  }

  @Version("1")
  @Roles(Role.admin, Role.operator)
  @Post(":id/command")
  sendCommand(
    @Param("id") id: string,
    @Body() dto: DeviceCommandDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devicesService.sendCommand(id, dto.action, { userId: user.id });
  }
}
