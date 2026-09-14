import type { ComponentType } from "react";
import {
  BulbIcon,
  CameraIcon,
  ClimateIcon,
  FanIcon,
  LockIcon,
  PlugIcon,
  WaterDropIcon,
} from "../components/icons";

export type DeviceKindId = "light" | "climate" | "water" | "lock" | "camera" | "fan" | "plug";

export interface DeviceKindMeta {
  id: DeviceKindId;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  accent: {
    text: string;
    glow: string;
    bgOn: string;
  };
}

const KINDS: Record<DeviceKindId, DeviceKindMeta> = {
  light: {
    id: "light",
    label: "Iluminacion",
    Icon: BulbIcon,
    accent: { text: "text-amber-300", glow: "shadow-amber-400/30", bgOn: "bg-amber-400/15" },
  },
  climate: {
    id: "climate",
    label: "Climatizacion",
    Icon: ClimateIcon,
    accent: { text: "text-sky-300", glow: "shadow-sky-400/30", bgOn: "bg-sky-400/15" },
  },
  water: {
    id: "water",
    label: "Agua",
    Icon: WaterDropIcon,
    accent: { text: "text-cyan-300", glow: "shadow-cyan-400/30", bgOn: "bg-cyan-400/15" },
  },
  lock: {
    id: "lock",
    label: "Acceso",
    Icon: LockIcon,
    accent: { text: "text-violet-300", glow: "shadow-violet-400/30", bgOn: "bg-violet-400/15" },
  },
  camera: {
    id: "camera",
    label: "Camara",
    Icon: CameraIcon,
    accent: { text: "text-rose-300", glow: "shadow-rose-400/30", bgOn: "bg-rose-400/15" },
  },
  fan: {
    id: "fan",
    label: "Ventilacion",
    Icon: FanIcon,
    accent: { text: "text-teal-300", glow: "shadow-teal-400/30", bgOn: "bg-teal-400/15" },
  },
  plug: {
    id: "plug",
    label: "Toma / Switch",
    Icon: PlugIcon,
    accent: { text: "text-emerald-300", glow: "shadow-emerald-400/30", bgOn: "bg-emerald-400/15" },
  },
};

const RULES: [RegExp, DeviceKindId][] = [
  [/aire|climat|\bac\b|hvac/i, "climate"],
  [/luz|luce|lampara|bombilla|foco|\blight\b|dimmer|\bled\b|rgbic|\brgb\b|\bcct\b/i, "light"],
  [/agua|\bwater\b|bomba|riego|grifo/i, "water"],
  [/cerradura|\block\b|puerta|acceso|chapa/i, "lock"],
  [/camara|cctv|\bcam\b/i, "camera"],
  [/ventilador|\bfan\b|extractor/i, "fan"],
];

/** Deduce el tipo de widget a mostrar a partir del nombre del dispositivo (no hay un campo "kind" en el modelo todavia). */
export function inferDeviceKind(name: string): DeviceKindMeta {
  // Los guiones/guiones bajos no son limite de palabra para \b (son \w), asi que
  // "TIRA_LED_OFICINA" no matcheaba \bled\b: se normalizan a espacios antes de probar.
  const normalized = name.replace(/[_-]+/g, " ");
  for (const [pattern, kind] of RULES) {
    if (pattern.test(normalized)) return KINDS[kind];
  }
  return KINDS.plug;
}
