import { Module } from "@nestjs/common";
import { AutomationsController } from "./automations.controller";
import { AutomationsService } from "./automations.service";
import { AutomationEngineService } from "./automation-engine.service";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { DevicesModule } from "../devices/devices.module";

@Module({
  imports: [AuthModule, EventsModule, DevicesModule],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationEngineService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
