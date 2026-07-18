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

/**
 * Reparte `total` em `n` parcelas com fechamento financeiro exato: as
 * primeiras n-1 parcelas recebem o valor-base (arredondado para baixo em 2
 * casas decimais) e a última absorve a diferença de arredondamento, de modo
 * que a soma das parcelas seja sempre igual a `total`. Usado para atribuir
 * pontos por documento comprobatório quando um único lançamento tem vários
 * comprovantes (o avaliador espera essa mesma semântica ao reconstruir o
 * dossiê a partir das tags do PDF ou do manifest — ver `dossierImport.ts`
 * no repositório avaliador-RSC-TAE).
 */
export function splitPointsEvenly(total: number, n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [normalizePointValue(total)];

  const base = normalizePointValue(Math.floor((total / n) * 100) / 100);
  const parcelas: number[] = [];
  let acumulado = 0;
  for (let i = 0; i < n - 1; i++) {
    parcelas.push(base);
    acumulado = normalizePointValue(acumulado + base);
  }
  parcelas.push(normalizePointValue(total - acumulado));
  return parcelas;
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
