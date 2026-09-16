import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";

export interface DeviceStateEvent {
  deviceId: string;
  state: string;
  rawPayload?: string;
  readings?: Record<string, unknown>;
}

/** In-process pub/sub between protocol adapters (publishers) and the realtime gateway / device state persistence (subscribers). */
@Injectable()
export class DeviceStateBus {
  private readonly subject = new Subject<DeviceStateEvent>();
  readonly events$ = this.subject.asObservable();

  emit(event: DeviceStateEvent) {
    this.subject.next(event);
  }
}
