import type { SensorReadings } from "../api/devices";
import { BatteryIcon, SignalIcon, ThermometerIcon, WaterDropIcon } from "./icons";

function batteryTone(battery?: number) {
  if (battery === undefined) return "text-slate-500";
  if (battery <= 20) return "text-red-400";
  if (battery <= 50) return "text-amber-300";
  return "text-emerald-300";
}

function formatNumber(value: number | undefined, digits: number) {
  return value === undefined ? "--" : value.toFixed(digits);
}

/** Version compacta para filas dentro de un grupo (reemplaza el ToggleSwitch cuando el dispositivo es un sensor). */
export function SensorReadingInline({ readings }: { readings: SensorReadings | null }) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-300">
      <span className="flex items-center gap-1">
        <ThermometerIcon className="h-3.5 w-3.5 text-orange-300" />
        {formatNumber(readings?.temperature, 1)}&deg;C
      </span>
      <span className="flex items-center gap-1">
        <WaterDropIcon className="h-3.5 w-3.5 text-cyan-300" />
        {formatNumber(readings?.humidity, 0)}%
      </span>
      <span className={`flex items-center gap-1 ${batteryTone(readings?.battery)}`}>
        <BatteryIcon className="h-3.5 w-3.5" />
        {formatNumber(readings?.battery, 0)}%
      </span>
    </div>
  );
}

/** Panel completo para la tarjeta de un sensor individual: lecturas grandes + diagnostico. */
export function SensorReadingPanel({ readings, updatedAt }: { readings: SensorReadings | null; updatedAt?: string | null }) {
  return (
    <div className="border-t border-slate-800/70 pt-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-800/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
            <ThermometerIcon className="h-3.5 w-3.5 text-orange-300" />
            Temperatura
          </div>
          <div className="text-2xl font-semibold tabular-nums text-slate-100">
            {formatNumber(readings?.temperature, 1)}
            <span className="text-sm text-slate-500">&deg;C</span>
          </div>
        </div>
        <div className="rounded-lg bg-slate-800/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
            <WaterDropIcon className="h-3.5 w-3.5 text-cyan-300" />
            Humedad
          </div>
          <div className="text-2xl font-semibold tabular-nums text-slate-100">
            {formatNumber(readings?.humidity, 0)}
            <span className="text-sm text-slate-500">%</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span className={`flex items-center gap-1.5 ${batteryTone(readings?.battery)}`}>
          <BatteryIcon className="h-3.5 w-3.5" />
          Bateria {formatNumber(readings?.battery, 0)}%
        </span>
        <span className="flex items-center gap-1.5">
          <SignalIcon className="h-3.5 w-3.5" />
          Señal {readings?.linkquality ?? "--"}
        </span>
        <span>{updatedAt ? new Date(updatedAt).toLocaleTimeString() : "sin datos"}</span>
      </div>
    </div>
  );
}
