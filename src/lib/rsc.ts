import { ItemRSC, RSC_LEVELS } from '../data/mock';

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
  const rule = normalizeText(item.regra_aceite);
  return rule.includes('risco de nao enquadramento') || rule.includes('enquadramento questionavel');
}
