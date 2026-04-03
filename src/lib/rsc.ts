import { Inciso, ItemRSC, Lancamento, RSC_LEVELS } from '../data/mock';

export type RscLevelId = (typeof RSC_LEVELS)[number]['id'];

const RSC_LEVEL_IDS = RSC_LEVELS.map((level) => level.id);

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getEligibleRscLevelId(escolaridade: string): RscLevelId | null {
  const normalized = normalizeText(escolaridade);

  if (!normalized) {
    return null;
  }

  if (normalized.includes('fundamental') && normalized.includes('incompleto')) {
    return 'RSC-I';
  }

  if (normalized.includes('fundamental')) {
    return 'RSC-II';
  }

  if (normalized.includes('medio')) {
    return 'RSC-III';
  }

  if (normalized.includes('graduacao')) {
    return 'RSC-IV';
  }

  if (normalized.includes('especializacao')) {
    return 'RSC-V';
  }

  if (normalized.includes('mestrado')) {
    return 'RSC-VI';
  }

  if (normalized.includes('doutorado')) {
    return null;
  }

  return null;
}

export function getEligibleRscLevel(escolaridade: string) {
  const eligibleLevelId = getEligibleRscLevelId(escolaridade);
  return RSC_LEVELS.find((level) => level.id === eligibleLevelId) ?? null;
}

export function getEligibleRscLevels(escolaridade: string) {
  const eligibleLevelId = getEligibleRscLevelId(escolaridade);

  if (!eligibleLevelId) {
    return RSC_LEVELS;
  }

  const eligibleIndex = RSC_LEVEL_IDS.indexOf(eligibleLevelId);
  return RSC_LEVELS.slice(0, eligibleIndex + 1);
}

export function isItemJuridicallyFragile(item: ItemRSC) {
  const rule = normalizeText(item.descricao);
  return rule.includes('risco de nao enquadramento') || rule.includes('enquadramento questionavel');
}

export interface LevelConstraintViolation {
  type: 'missing_inciso';
  requiredIncisos: readonly Inciso[];
}

export function validateLevelConstraints(
  nivelId: string,
  lancamentos: Lancamento[],
  items: ItemRSC[],
): LevelConstraintViolation[] {
  const level = RSC_LEVELS.find((l) => l.id === nivelId);
  if (!level || !level.incisosObrigatorios) return [];

  const lancamentoItemIds = new Set(lancamentos.map((l) => l.item_rsc_id));
  const incisosPresentes = new Set(
    items.filter((item) => lancamentoItemIds.has(item.id)).map((item) => item.inciso),
  );

  const violations: LevelConstraintViolation[] = [];
  for (const group of level.incisosObrigatorios as Inciso[][]) {
    if (!group.some((inc) => incisosPresentes.has(inc))) {
      violations.push({ type: 'missing_inciso', requiredIncisos: group });
    }
  }
  return violations;
}
