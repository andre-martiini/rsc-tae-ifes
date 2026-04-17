import {
  ESCOLARIDADES,
  type EscolaridadeAtual,
  type Inciso,
  type ItemRSC,
  type Lancamento,
  RSC_LEVELS,
  type Servidor,
} from '../data/mock';

export type RscLevelId = (typeof RSC_LEVELS)[number]['id'];

const RSC_LEVEL_IDS = RSC_LEVELS.map((level) => level.id);
const ESCOLARIDADE_TO_LEVEL: Record<EscolaridadeAtual, RscLevelId | null> = {
  'Ensino Fundamental Incompleto': 'RSC-I',
  'Ensino Fundamental': 'RSC-II',
  'Ensino Médio': 'RSC-III',
  'Graduação': 'RSC-IV',
  'Especialização': 'RSC-V',
  Mestrado: 'RSC-VI',
  Doutorado: null,
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getEligibleRscLevelId(escolaridade: string): RscLevelId | null {
  if ((ESCOLARIDADES as readonly string[]).includes(escolaridade)) {
    return ESCOLARIDADE_TO_LEVEL[escolaridade as EscolaridadeAtual];
  }

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

export function itemRequiresQualitativeJustification(item: ItemRSC) {
  return isItemJuridicallyFragile(item);
}

export interface FunctionalEligibility {
  ok: boolean;
  reasons: string[];
}

export function getServidorFunctionalEligibility(
  servidor: Pick<Servidor, 'situacao_funcional' | 'em_estagio_probatorio'>,
): FunctionalEligibility {
  const reasons: string[] = [];

  if (servidor.situacao_funcional && servidor.situacao_funcional !== 'Ativo') {
    reasons.push('O RSC-PCCTAE é aplicável apenas a servidor em situação funcional ativa.');
  }

  if (servidor.em_estagio_probatorio) {
    reasons.push('Não é possível emitir o pedido final para servidor em estágio probatório.');
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
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
