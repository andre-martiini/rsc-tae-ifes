/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cálculo de criação/mesclagem de Lancamento a partir de um conjunto de
 * documentos e um ItemRSC alvo. Extraído da Triagem (handleConfirmar /
 * handleMesclar) para ser reaproveitado também pela vinculação manual de
 * documentos na aba "Sem vínculo" e pela ação "Mover para outro item" em
 * Documents.tsx — as três telas precisam do mesmo cálculo de quantidade e
 * pontos para não divergir a pontuação conforme o caminho usado.
 */

import type { ItemRSC, Lancamento } from '../data/mock';
import { calculateLancamentoPoints } from './points';
import {
  abrangenciaPeriodos,
  mesclarPeriodos,
  periodoValido,
  periodosDoLancamento,
  totalDiasPeriodos,
  unidadesAnoFracao,
  unidadesMes,
} from './periodos';
import { getLancamentoDocumentIds } from './documentOrdering';

export interface Periodo {
  inicio: string;
  fim: string;
}

function calcularQuantidade(
  modoCalculo: ItemRSC['modo_calculo'],
  periodos: Periodo[],
  quantidadeManual: number,
): number {
  if (modoCalculo === 'auto_ano_fracao') return unidadesAnoFracao(totalDiasPeriodos(periodos));
  if (modoCalculo === 'auto_mes') return unidadesMes(totalDiasPeriodos(periodos));
  return quantidadeManual;
}

export interface NovoLancamentoInput {
  servidorId: string;
  item: ItemRSC;
  documentosIds: string[];
  periodos?: Periodo[];
  /** Quantidade digitada/sugerida; ignorada em itens de cálculo automático por período. */
  quantidadeOverride?: number;
  /** Data usada quando não há período informado (injetada para manter a função pura/testável). */
  dataReferencia: string;
}

export interface NovoLancamentoResultado {
  servidor_id: string;
  item_rsc_id: string;
  comprovantes_ids: string[];
  periodos?: Periodo[];
  data_inicio: string;
  data_fim: string;
  quantidade_informada: number;
  pontos_calculados: number;
}

/** Monta os campos de um Lancamento novo a partir de documentos + item. Não persiste nada. */
export function calcularNovoLancamento(input: NovoLancamentoInput): NovoLancamentoResultado {
  const { item, documentosIds, quantidadeOverride, dataReferencia } = input;
  const periodos = (input.periodos ?? []).filter(periodoValido);
  const abrang = abrangenciaPeriodos(periodos);
  const quantidadeManual = quantidadeOverride ?? Math.max(1, documentosIds.length);
  const quantidade = calcularQuantidade(item.modo_calculo, periodos, quantidadeManual);
  const pontos = calculateLancamentoPoints(quantidade, item.pontos_por_unidade);

  return {
    servidor_id: input.servidorId,
    item_rsc_id: item.id,
    comprovantes_ids: documentosIds,
    periodos: periodos.length > 0 ? periodos : undefined,
    data_inicio: abrang?.inicio ?? dataReferencia,
    data_fim: abrang?.fim ?? dataReferencia,
    quantidade_informada: quantidade,
    pontos_calculados: pontos,
  };
}

export interface MesclagemInput {
  item: ItemRSC;
  alvo: Lancamento;
  documentosIds: string[];
  periodosNovos?: Periodo[];
  /** Nº de unidades novas trazidas pelos documentos (padrão: 1 por documento novo). */
  quantidadeAdicional?: number;
}

export interface MesclagemResultado {
  comprovantes_ids: string[];
  periodos?: Periodo[];
  quantidade_informada: number;
  pontos_calculados: number;
  data_inicio: string;
  data_fim: string;
  deltaPontos: number;
  novosDocumentos: string[];
}

/** Monta os campos atualizados de um Lancamento existente ao mesclar novos documentos. Não persiste nada. */
export function calcularMesclagemLancamento(input: MesclagemInput): MesclagemResultado {
  const { item, alvo, documentosIds, quantidadeAdicional } = input;
  const docsAtuais = getLancamentoDocumentIds(alvo);
  const novosDocs = documentosIds.filter((id) => !docsAtuais.includes(id));
  const comprovantes = [...docsAtuais, ...novosDocs];
  const periodos = mesclarPeriodos([
    ...periodosDoLancamento(alvo),
    ...(input.periodosNovos ?? []).filter(periodoValido),
  ]);

  let quantidade = alvo.quantidade_informada;
  if (item.modo_calculo === 'auto_ano_fracao') {
    quantidade = unidadesAnoFracao(totalDiasPeriodos(periodos));
  } else if (item.modo_calculo === 'auto_mes') {
    quantidade = unidadesMes(totalDiasPeriodos(periodos));
  } else if (novosDocs.length > 0) {
    quantidade = alvo.quantidade_informada + (quantidadeAdicional ?? novosDocs.length);
  }

  const pontos = calculateLancamentoPoints(quantidade, item.pontos_por_unidade);
  const abr = abrangenciaPeriodos(periodos);

  return {
    comprovantes_ids: comprovantes,
    periodos: periodos.length > 0 ? periodos : undefined,
    quantidade_informada: quantidade,
    pontos_calculados: pontos,
    data_inicio: abr?.inicio ?? alvo.data_inicio,
    data_fim: abr?.fim ?? alvo.data_fim,
    deltaPontos: pontos - alvo.pontos_calculados,
    novosDocumentos: novosDocs,
  };
}

/**
 * Encontra um lançamento já existente do mesmo item para oferecer mesclagem
 * em vez de criar um lançamento novo (evita fragmentar/duplicar pontuação).
 * Prefere o lançamento que já compartilha algum documento com o conjunto informado.
 */
export function encontrarLancamentoParaMesclar(
  itemId: string,
  lancamentosDoServidor: Lancamento[],
  documentosIds: string[],
  lancamentoIdExcluir?: string,
): Lancamento | null {
  const candidatos = lancamentosDoServidor.filter(
    (l) => l.item_rsc_id === itemId && l.id !== lancamentoIdExcluir,
  );
  if (candidatos.length === 0) return null;
  const comDocsEmComum = candidatos.find((l) =>
    getLancamentoDocumentIds(l).some((id) => documentosIds.includes(id)),
  );
  return comDocsEmComum ?? candidatos[0];
}
