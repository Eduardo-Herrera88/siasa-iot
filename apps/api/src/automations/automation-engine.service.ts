import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ComparisonOperator, RuleExecutionStatus } from "@prisma/client";
import type { Subscription } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import { DeviceStateBus, DeviceStateEvent } from "../state-bus/device-state-bus.service";
import { EventLogService } from "../events/event-log.service";
import { DevicesService } from "../devices/devices.service";

function compare(operator: ComparisonOperator, actual: string, expected: string): boolean {
  return operator === ComparisonOperator.eq ? actual === expected : actual !== expected;
}

/**
 * Escucha DeviceStateBus (mismo bus que alimenta el gateway en tiempo real) y evalua
 * las reglas cuyo trigger coincide con el dispositivo que acaba de cambiar de estado.
 * Nota: como las acciones de una regla pueden a su vez generar nuevos cambios de estado
 * (p.ej. si el dispositivo confirma el nuevo estado por MQTT), es responsabilidad de quien
 * diseña las reglas evitar ciclos entre disparadores y acciones.
 */
@Injectable()
export class AutomationEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("AutomationEngine");
  private subscription?: Subscription;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateBus: DeviceStateBus,
    private readonly eventLog: EventLogService,
    private readonly devicesService: DevicesService,
  ) {}

  onModuleInit() {
    this.subscription = this.stateBus.events$.subscribe((event) => {
      this.evaluate(event).catch((err) =>
        this.logger.error(`Error evaluando reglas para dispositivo ${event.deviceId}: ${err.message}`),
      );
    });
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
  }

  private async evaluate(event: DeviceStateEvent) {
    const matchingTriggers = await this.prisma.ruleTrigger.findMany({
      where: { deviceId: event.deviceId, rule: { enabled: true } },
      include: { rule: { include: { conditions: true, actions: { orderBy: { order: "asc" } } } } },
    });

    for (const trigger of matchingTriggers) {
      if (!compare(trigger.operator, event.state, trigger.value)) continue;
      await this.fireRule(trigger.rule.id, trigger.rule.name, trigger.rule.conditions, trigger.rule.actions);
    }
  }

  private async fireRule(
    ruleId: string,
    ruleName: string,
    conditions: { deviceId: string; operator: ComparisonOperator; value: string }[],
    actions: { deviceId: string; action: "on" | "off"; delayMs: number }[],
  ) {
    try {
      const conditionsMet = await this.checkConditions(conditions);
      if (!conditionsMet) {
        await this.recordExecution(ruleId, RuleExecutionStatus.condition_not_met, "Una o mas condiciones no se cumplieron");
        return;
      }

      for (const action of actions) {
        await this.devicesService.sendCommand(action.deviceId, action.action, {
          ruleId,
          delayMs: action.delayMs || undefined,
        });
      }

      await this.recordExecution(ruleId, RuleExecutionStatus.success, `${actions.length} accion(es) encolada(s)`);
      await this.eventLog.log({
        type: "automation.fired",
        message: `Regla "${ruleName}" disparada, ${actions.length} accion(es) encolada(s)`,
      });
    } catch (err) {
      const message = (err as Error).message;
      await this.recordExecution(ruleId, RuleExecutionStatus.failed, message);
      await this.eventLog.log({
        type: "automation.failed",
        message: `Fallo al ejecutar la regla "${ruleName}": ${message}`,
      });
    }
  }

  private async checkConditions(
    conditions: { deviceId: string; operator: ComparisonOperator; value: string }[],
  ): Promise<boolean> {
    for (const condition of conditions) {
      const state = await this.prisma.deviceState.findUnique({ where: { deviceId: condition.deviceId } });
      const actual = state?.state ?? "";
      if (!compare(condition.operator, actual, condition.value)) {
        return false;
      }
    }
    return true;
  }

  private recordExecution(ruleId: string, status: RuleExecutionStatus, message: string) {
    return this.prisma.ruleExecution.create({ data: { ruleId, status, message } });
  }
}
