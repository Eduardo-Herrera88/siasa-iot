import { Module } from "@nestjs/common";
import { AdaptersModule } from "../adapters.module";
import { EwelinkAdapterService } from "./ewelink-adapter.service";

/**
 * Modulo autocontenido: se registra a si mismo en el AdapterRegistry existente (via
 * AdaptersModule, sin modificar ese modulo) al arrancar. No toca MQTT, HTTP, ni el
 * importador de Home Assistant.
 */
@Module({
  imports: [AdaptersModule],
  providers: [EwelinkAdapterService],
  exports: [EwelinkAdapterService],
})
export class EwelinkModule {}
