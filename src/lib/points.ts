const POINT_SCALE = 100000;

function toScaledPoint(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * POINT_SCALE);
}

function fromScaledPoint(value: number): number {
  return value / POINT_SCALE;
}

export function normalizePointValue(value: number): number {
  return fromScaledPoint(toScaledPoint(value));
}

export function addPointValues(...values: number[]): number {
  return fromScaledPoint(values.reduce((sum, value) => sum + toScaledPoint(value), 0));
}

export function sumPointValues(values: Iterable<number>): number {
  let total = 0;
  for (const value of values) {
    total += toScaledPoint(value);
  }
  return fromScaledPoint(total);
}

export function calculateLancamentoPoints(
  quantidade: number,
  pontosPorUnidade: number,
): number {
  return normalizePointValue(quantidade * pontosPorUnidade);
}

export function formatPointValue(
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  const normalized = normalizePointValue(value);
  return normalized.toLocaleString('pt-BR', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 5,
  });
}

export function formatPointValueWithUnit(
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    unitLabel?: string;
  },
): string {
  const formatted = formatPointValue(value, options);
  return `${formatted} ${options?.unitLabel ?? 'pts'}`;
}
