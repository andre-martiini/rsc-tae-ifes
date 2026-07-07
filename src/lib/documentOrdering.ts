import type { Documento, ItemRSC, Lancamento } from '../data/mock';

const INCISO_ORDER: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
};

export type DossierDocumentOrderEntry = {
  index: number;
  lancamento: Lancamento;
  item?: ItemRSC;
  documentPositionInLaunch: number;
};

export function getLancamentoDocumentIds(lancamento: Lancamento) {
  return lancamento.comprovantes_ids ?? (lancamento.documento_id ? [lancamento.documento_id] : []);
}

export function formatDossierDocumentLabel(index: number) {
  return `Documento ${index + 1}`;
}

export function itemDossierCode(item?: ItemRSC) {
  if (!item) return 'ITEM-NAO-MAPEADO';
  return `${item.inciso}-${item.numero}`;
}

export function compareItemsByDossierOrder(itemA?: ItemRSC, itemB?: ItemRSC) {
  const incisoA = itemA ? INCISO_ORDER[itemA.inciso] ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
  const incisoB = itemB ? INCISO_ORDER[itemB.inciso] ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
  if (incisoA !== incisoB) return incisoA - incisoB;

  const numeroA = itemA?.numero ?? Number.MAX_SAFE_INTEGER;
  const numeroB = itemB?.numero ?? Number.MAX_SAFE_INTEGER;
  if (numeroA !== numeroB) return numeroA - numeroB;

  return (itemA?.id ?? '').localeCompare(itemB?.id ?? '');
}

export function compareLancamentosByDossierOrder(
  lancamentoA: Lancamento,
  lancamentoB: Lancamento,
  itensById: Map<string, ItemRSC>,
  lancamentoOriginalIndex = new Map<string, number>(),
) {
  const itemCompare = compareItemsByDossierOrder(
    itensById.get(lancamentoA.item_rsc_id),
    itensById.get(lancamentoB.item_rsc_id),
  );
  if (itemCompare !== 0) return itemCompare;

  const dateCompare =
    (lancamentoA.data_inicio || '').localeCompare(lancamentoB.data_inicio || '') ||
    (lancamentoA.data_fim || '').localeCompare(lancamentoB.data_fim || '');
  if (dateCompare !== 0) return dateCompare;

  const indexA = lancamentoOriginalIndex.get(lancamentoA.id) ?? Number.MAX_SAFE_INTEGER;
  const indexB = lancamentoOriginalIndex.get(lancamentoB.id) ?? Number.MAX_SAFE_INTEGER;
  if (indexA !== indexB) return indexA - indexB;

  return lancamentoA.id.localeCompare(lancamentoB.id);
}

export function sortLancamentosByDossierOrder(lancamentos: Lancamento[], itensRSC: ItemRSC[]) {
  const itensById = new Map(itensRSC.map((item) => [item.id, item]));
  const lancamentoOriginalIndex = new Map(lancamentos.map((lancamento, index) => [lancamento.id, index]));

  return [...lancamentos].sort((a, b) =>
    compareLancamentosByDossierOrder(a, b, itensById, lancamentoOriginalIndex),
  );
}

export function buildDossierDocumentOrder(params: {
  lancamentos: Lancamento[];
  itensRSC: ItemRSC[];
}) {
  const order = new Map<string, DossierDocumentOrderEntry>();
  const sortedLancamentos = sortLancamentosByDossierOrder(params.lancamentos, params.itensRSC);
  const itensById = new Map(params.itensRSC.map((item) => [item.id, item]));

  for (const lancamento of sortedLancamentos) {
    getLancamentoDocumentIds(lancamento).forEach((docId, documentPositionInLaunch) => {
      if (order.has(docId)) return;
      order.set(docId, {
        index: order.size,
        lancamento,
        item: itensById.get(lancamento.item_rsc_id),
        documentPositionInLaunch,
      });
    });
  }

  return order;
}

export function compareDocumentsByDossierOrder(
  docA: Documento,
  docB: Documento,
  order: Map<string, DossierDocumentOrderEntry>,
) {
  const orderA = order.get(docA.id);
  const orderB = order.get(docB.id);

  if (orderA && orderB && orderA.index !== orderB.index) return orderA.index - orderB.index;
  if (orderA && !orderB) return -1;
  if (!orderA && orderB) return 1;

  return (
    (docB.data_upload || '').localeCompare(docA.data_upload || '') ||
    docA.nome_arquivo.localeCompare(docB.nome_arquivo) ||
    docA.id.localeCompare(docB.id)
  );
}

export function sortDocumentsByDossierOrder(
  documents: Documento[],
  order: Map<string, DossierDocumentOrderEntry>,
) {
  return [...documents].sort((a, b) => compareDocumentsByDossierOrder(a, b, order));
}
