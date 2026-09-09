import { Global, Module } from "@nestjs/common";
import { DeviceStateBus } from "./device-state-bus.service";

@Global()
@Module({
  providers: [DeviceStateBus],
  exports: [DeviceStateBus],
})
export class StateBusModule {}
