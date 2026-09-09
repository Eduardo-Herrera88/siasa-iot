const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses simple duration strings like "15m", "7d", "500ms" into milliseconds. */
export default function ms(value: string): number {
  const match = value.trim().match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!match) {
    throw new Error(`Duracion invalida: ${value}`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit.toLowerCase()];
}
