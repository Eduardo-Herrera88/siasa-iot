import { Module } from "@nestjs/common";
import { AdapterRegistry } from "./adapter-registry.service";
import { MqttAdapterService } from "./mqtt/mqtt.adapter.service";
import { HttpAdapterService } from "./http/http.adapter.service";

@Module({
  providers: [AdapterRegistry, MqttAdapterService, HttpAdapterService],
  exports: [AdapterRegistry, MqttAdapterService, HttpAdapterService],
})
export class AdaptersModule {}
