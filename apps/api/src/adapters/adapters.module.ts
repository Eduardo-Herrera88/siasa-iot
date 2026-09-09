import { Module } from "@nestjs/common";
import { AdapterRegistry } from "./adapter-registry.service";
import { MqttAdapterService } from "./mqtt/mqtt.adapter.service";

@Module({
  providers: [AdapterRegistry, MqttAdapterService],
  exports: [AdapterRegistry, MqttAdapterService],
})
export class AdaptersModule {}
