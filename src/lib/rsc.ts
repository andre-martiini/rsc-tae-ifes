import {
  ESCOLARIDADES,
  type EscolaridadeAtual,
  type Inciso,
  type ItemRSC,
  type Lancamento,
  RSC_LEVELS,
  type Servidor,
} from '../data/mock';
import { parseLocalDate } from './utils';

export type RscLevelId = (typeof RSC_LEVELS)[number]['id'];

const RSC_LEVEL_IDS = RSC_LEVELS.map((level) => level.id);
const ESCOLARIDADE_TO_LEVEL: Record<EscolaridadeAtual, RscLevelId | null> = {
  'Ensino Fundamental Incompleto': 'RSC-I',
  'Ensino Fundamental': 'RSC-II',
  'Ensino Médio': 'RSC-III',
  'Técnico de Nível Médio': 'RSC-III',
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

  // Técnico de Nível Médio e Ensino Médio → RSC-III
  if (
    normalized.includes('medio') ||
    (normalized.includes('tecnico') && normalized.includes('nivel'))
  ) {
    return 'RSC-III';
  }

  // Títulos mais altos primeiro: "pós-graduação" contém "graduacao" e seria
  // capturada indevidamente pela checagem de graduação.
  if (normalized.includes('doutorado')) {
    return null;
  }

  if (normalized.includes('mestrado')) {
    return 'RSC-VI';
  }

  if (
    normalized.includes('especializacao') ||
    normalized.includes('lato sensu') ||
    normalized.includes('pos-graduacao') ||
    normalized.includes('pos graduacao')
  ) {
    return 'RSC-V';
  }

  if (normalized.includes('graduacao')) {
    return 'RSC-IV';
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
  const sensitiveItemIds = new Set([
    'item-20',
    'item-25',
    'item-28',
    'item-29',
    'item-30',
    'item-31',
    'item-32',
    'item-41',
    'item-49',
    'item-56',
  ]);

  return (
    sensitiveItemIds.has(item.id) ||
    rule.includes('risco de nao enquadramento') ||
    rule.includes('enquadramento questionavel') ||
    rule.includes('atividade tecnica de natureza especializada') ||
    rule.includes('atuacao diferenciada') ||
    rule.includes('atribuicoes ordinarias')
  );
}

export function itemRequiresQualitativeJustification(item: ItemRSC) {
  return !!item;
}

export function getDistinctRscCriterionCount(lancamentos: Lancamento[], items: ItemRSC[]) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const criterionKeys = new Set<string>();

  for (const lancamento of lancamentos) {
    const item = itemById.get(lancamento.item_rsc_id);
    // Lançamentos de itens que não existem mais no rol vigente (ex.: itens
    // excluídos pelo decreto) valem 0 pontos e não contam como critério.
    if (!item) continue;
    criterionKeys.add(`${item.inciso}:${item.numero}`);
  }

  return criterionKeys.size;
}

export interface FunctionalEligibility {
  ok: boolean;
  reasons: string[];
}

export interface ProbationaryStatus {
  inProbation: boolean;
  probationEndDate?: Date;
}

export function getServidorProbationaryStatus(
  servidor: Pick<Servidor, 'data_ingresso_ife' | 'data_ingresso'>,
  referenceDate = new Date(),
): ProbationaryStatus {
  const ingresso = servidor.data_ingresso_ife || servidor.data_ingresso;

  if (!ingresso) {
    return { inProbation: false };
  }

  const ingressoDate = parseLocalDate(ingresso);

  if (Number.isNaN(ingressoDate.getTime())) {
    return { inProbation: false };
  }

  const probationEndDate = new Date(ingressoDate);
  probationEndDate.setFullYear(probationEndDate.getFullYear() + 3);

  return {
    inProbation: referenceDate < probationEndDate,
    probationEndDate,
  };
}

export function getServidorFunctionalEligibility(
  servidor: Pick<Servidor, 'situacao_funcional' | 'data_ingresso_ife' | 'data_ingresso'>,
): FunctionalEligibility {
  const reasons: string[] = [];
  const probationaryStatus = getServidorProbationaryStatus(servidor);

  if (servidor.situacao_funcional && servidor.situacao_funcional !== 'Ativo') {
    reasons.push('O RSC-PCCTAE é aplicável apenas a servidor em situação funcional ativa.');
  }

  if (probationaryStatus.inProbation) {
    reasons.push('A data de início do efetivo exercício indica estágio probatório em andamento; o servidor pode organizar informações no sistema, mas não pode solicitar o RSC neste momento.');
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
