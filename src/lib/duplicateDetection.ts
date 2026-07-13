import type { Documento, ItemRSC, Lancamento } from '../data/mock';
import { getLancamentoDocumentIds, itemDossierCode } from './documentOrdering';

/**
 * Detecção de reuso de documentos entre lançamentos e sugestões.
 *
 * Complementa a deduplicação binária por hash (AppContext): aqui o objetivo é
 * apontar quando um documento — ou o mesmo conteúdo transcrito — já sustenta
 * pontuação em algum lançamento do servidor, prevenindo dupla contagem antes
 * da auditoria IA.
 */

export interface UsoDocumento {
  lancamento: Lancamento;
  item?: ItemRSC;
}

/** Mapeia cada documento aos lançamentos (e itens) em que ele já pontua. */
export function mapearUsoDocumentos(
  lancamentos: Lancamento[],
  itensRSC: ItemRSC[],
): Map<string, UsoDocumento[]> {
  const itensById = new Map(itensRSC.map((item) => [item.id, item]));
  const usos = new Map<string, UsoDocumento[]>();
  for (const lancamento of lancamentos) {
    const item = itensById.get(lancamento.item_rsc_id);
    for (const docId of getLancamentoDocumentIds(lancamento)) {
      const lista = usos.get(docId) ?? [];
      lista.push({ lancamento, item });
      usos.set(docId, lista);
    }
  }
  return usos;
}

/** Códigos de dossiê ("I-3", "V-1") dos itens em que os usos ocorrem, sem repetição. */
export function codigosItensDosUsos(usos: UsoDocumento[]): string[] {
  const codigos = new Set<string>();
  for (const uso of usos) {
    codigos.add(itemDossierCode(uso.item));
  }
  return Array.from(codigos);
}

/**
 * Transcrições mais curtas que isso não são comparadas: OCRs curtos de
 * documentos distintos (ex.: carimbos, capas) colidem com facilidade.
 */
export const MIN_CHARS_COMPARACAO_CONTEUDO = 200;

/** Normaliza a transcrição para comparação de conteúdo (caixa, acentos e espaços). */
export function normalizarTranscricao(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chave de comparação de conteúdo do documento, ou null se curto demais. */
export function chaveConteudo(doc: Pick<Documento, 'transcricao'>): string | null {
  const normalizada = normalizarTranscricao(doc.transcricao ?? '');
  return normalizada.length >= MIN_CHARS_COMPARACAO_CONTEUDO ? normalizada : null;
}

/**
 * Documentos com transcrição idêntica (arquivos binariamente diferentes que o
 * hash não pega: re-scan, re-export). Retorna docId -> demais docs iguais.
 */
export function encontrarDuplicatasPorConteudo(
  documentos: Documento[],
): Map<string, Documento[]> {
  const porChave = new Map<string, Documento[]>();
  for (const doc of documentos) {
    const chave = chaveConteudo(doc);
    if (!chave) continue;
    const grupo = porChave.get(chave) ?? [];
    grupo.push(doc);
    porChave.set(chave, grupo);
  }

  const resultado = new Map<string, Documento[]>();
  for (const grupo of porChave.values()) {
    if (grupo.length < 2) continue;
    for (const doc of grupo) {
      resultado.set(
        doc.id,
        grupo.filter((outro) => outro.id !== doc.id),
      );
    }
  }
  return resultado;
}
