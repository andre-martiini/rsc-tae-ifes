import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import { formatPointValue, sumPointValues } from './points';
import { formatarDataSegura } from './utils';

type NivelResumo = {
  id?: string;
  label?: string;
  equivalencia?: string;
  pontosMinimos?: number;
  itensMinimos?: number;
} | null;

type AuditPromptParams = {
  servidor: Servidor;
  nivelPleiteado: NivelResumo;
  processo: ProcessoRSC;
  lancamentos: Lancamento[];
  itensRSC: ItemRSC[];
  documentos: Documento[];
};

function itemCode(item?: ItemRSC) {
  if (!item) return 'ITEM-NAO-MAPEADO';
  return `${item.inciso}-${item.numero}`;
}

function documentKey(index: number) {
  return `DOC-${String(index + 1).padStart(2, '0')}`;
}

function itemReference(item?: ItemRSC) {
  if (!item) return 'ITEM-NAO-MAPEADO';
  return `${itemCode(item)} - Item ${item.numero}: ${item.descricao}`;
}

function cleanText(value?: string) {
  return (value ?? '')
    .replace(/\[RSC:[A-Z_]+:[^\]]+\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function cleanInline(value?: string) {
  return cleanText(value).replace(/\s+/g, ' ').trim();
}

function formatDateRange(lancamento: Lancamento) {
  if (!lancamento.data_inicio && !lancamento.data_fim) return 'Nao informado ou nao exigido';
  const start = formatarDataSegura(lancamento.data_inicio, 'Nao informado');
  const end = formatarDataSegura(lancamento.data_fim, 'Nao informado');
  return `${start} a ${end}`;
}

export function estimatePromptTokens(prompt: string) {
  return Math.ceil(prompt.length / 4);
}

export function gerarPromptAuditoriaConsolidada(params: AuditPromptParams) {
  const { servidor, nivelPleiteado, processo, lancamentos, itensRSC, documentos } = params;
  const docsById = new Map(documentos.map((doc) => [doc.id, doc]));
  const itensById = new Map(itensRSC.map((item) => [item.id, item]));
  const usedDocumentIds = Array.from(new Set(lancamentos.map((entry) => entry.documento_id).filter(Boolean) as string[]));
  const usedDocuments = usedDocumentIds.map((id) => docsById.get(id)).filter((doc): doc is Documento => !!doc);
  const docKeys = new Map(usedDocuments.map((doc, index) => [doc.id, documentKey(index)]));
  const documentLinksCount = lancamentos.filter((entry) => !!entry.documento_id).length;
  const launchesByDocumentId = new Map<string, Lancamento[]>();
  lancamentos.forEach((entry) => {
    if (!entry.documento_id) return;
    const current = launchesByDocumentId.get(entry.documento_id) ?? [];
    current.push(entry);
    launchesByDocumentId.set(entry.documento_id, current);
  });
  const totalPontos = sumPointValues(lancamentos.map((entry) => entry.pontos_calculados));
  const itensDistintos = new Set(lancamentos.map((entry) => entry.item_rsc_id)).size;

  const header = [
    'Voce e um Auditor Juridico de IA especialista em Reconhecimento de Saberes e Competencias (RSC) da Rede Federal de Educacao.',
    '',
    'Sua missao e realizar uma auditoria semantica consolidada do dossie abaixo antes da exportacao final.',
    'Procure conflitos, duplicidades, sobreposicoes, inconsistencias de datas, reutilizacao indevida de documentos e erros evidentes de enquadramento.',
    '',
    'NAO invente fatos. Se uma conclusao depender de texto ausente ou ilegivel, marque como risco e explique a limitacao.',
    '',
    '=== CRITERIOS PRIORITARIOS DE AUDITORIA ===',
    '',
    '1. DUPLICIDADE DE ENCARGO, COMISSAO, PORTARIA OU FATO:',
    '   Identifique designacoes, certificados, eventos, premios, atividades ou fatos substancialmente iguais lancados mais de uma vez.',
    '   Inclua prorrogacoes, reconducoes ou renovacoes do mesmo encargo quando configurarem continuidade do mesmo fato.',
    '',
    '2. REUTILIZACAO INDEVIDA DE COMPROVANTE:',
    '   Identifique o mesmo documento, link, hash, titulo ou conteudo probatorio usado para comprovar itens diferentes.',
    '',
    '3. SOBREPOSICAO TEMPORAL SUSPEITA:',
    '   Identifique periodos simultaneos ou incompatibilidades temporais entre atividades declaradas.',
    '',
    '4. INCONSISTENCIA ENTRE LANCAMENTO E DOCUMENTO:',
    '   Compare datas, nomes, quantidade, unidade de medida, pontos, descricao do item e conteudo do documento.',
    '',
    '5. RISCO DE ENQUADRAMENTO OU ATRIBUICAO ORDINARIA:',
    '   Aponte itens em que o documento parece comprovar fato diferente da regra, atividade ordinaria do cargo ou informacao insuficiente.',
  ].join('\n');

  const serverBlock = [
    '=== DADOS DO SERVIDOR E DO PROCESSO ===',
    '',
    `Nome completo : ${servidor.nome_completo || 'Nao informado'}`,
    `SIAPE         : ${servidor.siape || 'Nao informado'}`,
    `Cargo         : ${servidor.cargo || 'Nao informado'}`,
    `Lotacao       : ${servidor.lotacao || 'Nao informada'}`,
    `Ingresso IFE  : ${formatarDataSegura(servidor.data_ingresso_ife || servidor.data_ingresso, 'Nao informado')}`,
    `Nivel pedido  : ${nivelPleiteado?.label ?? processo.nivel_pleiteado_id ?? 'Nao definido'}`,
    `Equivalencia  : ${nivelPleiteado?.equivalencia ?? 'Nao informada'}`,
    `Pontos totais : ${formatPointValue(totalPontos)}`,
    `Itens usados  : ${itensDistintos}`,
    `Lancamentos   : ${lancamentos.length}`,
    `Vinculos doc. : ${documentLinksCount}`,
    `Docs. unicos  : ${usedDocuments.length}`,
  ].join('\n');

  const documentBlock = [
    '=== CATALOGO DE DOCUMENTOS USADOS ===',
    '',
    'Este catalogo lista DOCUMENTOS UNICOS, nao a quantidade de lancamentos.',
    'Se um mesmo documento foi usado em dois itens, ele aparecera uma unica vez aqui, mas tera dois itens relacionados.',
    'Cada documento recebe uma chave DOC-XX e informa exatamente em qual item do sistema ele foi usado.',
    'Ao recomendar ajustes, cite sempre o item do sistema (ex.: II-11 - Item 11), pois e por ele que o usuario localizara o lancamento para corrigir.',
    '',
    ...usedDocuments.flatMap((doc, index) => {
      const transcription = cleanText(doc.transcricao);
      const links = doc.gedoc_links?.length ? doc.gedoc_links.join('\n  - ') : '';
      const relatedLaunches = launchesByDocumentId.get(doc.id) ?? [];
      const relatedItems = relatedLaunches
        .map((entry) => itensById.get(entry.item_rsc_id))
        .filter((item): item is ItemRSC => !!item);
      const uniqueRelatedItems = Array.from(new Map(relatedItems.map((item) => [item.id, item])).values());
      return [
        '------------------------------------------------------------',
        `${documentKey(index)}: ${doc.nome_arquivo}`,
        'Usado no(s) item(ns) do sistema:',
        ...(
          uniqueRelatedItems.length
            ? uniqueRelatedItems.map((item) => `  - ${itemReference(item)}`)
            : ['  - Item nao identificado']
        ),
        `ID interno     : ${doc.id}`,
        `Hash           : ${doc.hash_arquivo ?? 'Nao informado'}`,
        `Tipo           : ${doc.tipo_documento ?? 'Nao informado'}`,
        `Origem         : ${doc.arquivo_origem_nome ?? 'Nao informada'}`,
        `Links GEDOC    : ${links ? `\n  - ${links}` : 'Nao informado'}`,
        'Texto extraido :',
        '```',
        transcription || 'AVISO: Nao ha texto extraido para este documento. Audite com base nos metadados, links, nome do arquivo e lancamentos relacionados.',
        '```',
        '',
      ];
    }),
  ].join('\n');

  const launches = [...lancamentos].sort((a, b) => {
    const itemA = itensById.get(a.item_rsc_id);
    const itemB = itensById.get(b.item_rsc_id);
    const codeCompare = itemCode(itemA).localeCompare(itemCode(itemB));
    return codeCompare || a.id.localeCompare(b.id);
  });

  const launchesBlock = [
    '=== LANCAMENTOS DECLARADOS ===',
    '',
    ...launches.flatMap((entry, index) => {
      const item = itensById.get(entry.item_rsc_id);
      const doc = entry.documento_id ? docsById.get(entry.documento_id) : undefined;
      return [
        '------------------------------------------------------------',
        `LANCAMENTO ${index + 1}: ${itemCode(item)}`,
        `Item para ajuste   : ${itemReference(item)}`,
        `Item oficial       : ${item?.descricao ?? 'Item nao encontrado na tabela oficial'}`,
        `Inciso             : ${item?.inciso ?? 'Nao identificado'}`,
        `Pontuacao oficial  : ${item ? `${formatPointValue(item.pontos_por_unidade)} pts por ${item.unidade_medida}` : 'Nao mapeada'}`,
        `Quantidade         : ${entry.quantidade_informada}`,
        `Periodo declarado  : ${formatDateRange(entry)}`,
        `Pontos declarados  : ${formatPointValue(entry.pontos_calculados)}`,
        `Documento vinculado: ${doc ? `${docKeys.get(doc.id) ?? doc.id} - ${doc.nome_arquivo}` : 'Sem documento vinculado'}`,
        `Localizar no sistema: abra a aba Itens e busque por ${itemCode(item)} / Item ${item?.numero ?? 'nao mapeado'}`,
        `Observacao usuario : ${cleanInline(entry.observacao) || 'Sem observacao'}`,
        `Status auditoria   : ${entry.status_auditoria}`,
        '',
      ];
    }),
  ].join('\n');

  const responseFormat = [
    '=== FORMATO OBRIGATORIO DA RESPOSTA ===',
    '',
    'Responda somente em Portugues do Brasil, em tom formal, direto e com acentuacao correta.',
    '',
    '## Resumo Geral',
    'Informe se ha conflitos, quantos riscos foram encontrados e se o dossie parece pronto para exportacao.',
    '',
    '## Tabela de Conflitos e Riscos',
    'Se nao houver achados, escreva: Nenhum conflito detectado.',
    'Se houver achados, use esta tabela:',
    '',
    '| Numero | Severidade | Tipo | Item para Ajuste no Sistema | Documento(s) | Descricao do Problema | Recomendacao |',
    '|--------|------------|------|-----------------------------|--------------|------------------------|--------------|',
    '',
    'Use Severidade como: Alta, Media ou Baixa.',
    'Na coluna "Item para Ajuste no Sistema", informe o codigo e o numero do item, por exemplo: II-11 - Item 11.',
    '',
    '## Itens Sem Conflito Aparente',
    'Liste os itens auditados que nao apresentaram conflito aparente.',
    '',
    '## Pendencias de Texto ou Legibilidade',
    'Liste documentos sem transcricao, com OCR fraco ou com informacao insuficiente.',
    '',
    '## Acoes Recomendadas Antes da Exportacao',
    'Liste ajustes objetivos que o servidor deve fazer no sistema antes de gerar o pacote PDF final.',
  ].join('\n');

  return [header, '', serverBlock, '', documentBlock, '', launchesBlock, '', responseFormat].join('\n');
}
