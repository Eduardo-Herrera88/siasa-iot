import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { DeviceProtocol } from "@prisma/client";
import type { DeviceAdapter } from "./adapter.interface";

/** Resuelve el adaptador correcto segun el protocolo del dispositivo. Los adaptadores se registran en AdaptersModule. */
@Injectable()
export class AdapterRegistry {
  private readonly adapters = new Map<DeviceProtocol, DeviceAdapter>();

  register(adapter: DeviceAdapter) {
    this.adapters.set(adapter.protocol, adapter);
  }

  resolve(protocol: DeviceProtocol): DeviceAdapter {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      throw new InternalServerErrorException(`No hay adaptador registrado para el protocolo ${protocol}`);
    }
    return adapter;
  }

  all(): DeviceAdapter[] {
    return Array.from(this.adapters.values());
  }
}
