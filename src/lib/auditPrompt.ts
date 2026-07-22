import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import {
  buildDossierDocumentOrder,
  formatDossierDocumentLabel,
  getLancamentoDocumentIds,
  sortDocumentsByDossierOrder,
  sortLancamentosByDossierOrder,
} from './documentOrdering';
import { formatPointValue, sumPointValues } from './points';
import { getDistinctRscCriterionCount } from './rsc';
import { formatarDataSegura } from './utils';
import { periodosDoLancamento } from './periodos';

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
  return formatDossierDocumentLabel(index);
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
  const periodos = periodosDoLancamento(lancamento);
  if (periodos.length === 0) return 'Nao informado ou nao exigido';
  return periodos
    .map((p) => `${formatarDataSegura(p.inicio, 'Nao informado')} a ${formatarDataSegura(p.fim, 'Nao informado')}`)
    .join('; ');
}

export function estimatePromptTokens(prompt: string) {
  return Math.ceil(prompt.length / 4);
}

export function gerarPromptAuditoriaConsolidada(params: AuditPromptParams) {
  const { servidor, nivelPleiteado, processo, lancamentos, itensRSC, documentos } = params;
  const docsById = new Map(documentos.map((doc) => [doc.id, doc]));
  const itensById = new Map(itensRSC.map((item) => [item.id, item]));
  const getIds = getLancamentoDocumentIds;
  const usedDocumentIds = Array.from(new Set(lancamentos.flatMap(getIds)));
  const documentOrder = buildDossierDocumentOrder({ lancamentos, itensRSC });
  const usedDocuments = sortDocumentsByDossierOrder(
    usedDocumentIds.map((id) => docsById.get(id)).filter((doc): doc is Documento => !!doc),
    documentOrder,
  );
  const docKeys = new Map(usedDocuments.map((doc, index) => [doc.id, documentKey(index)]));
  const documentLinksCount = lancamentos.filter((entry) => getIds(entry).length > 0).length;
  const launchesByDocumentId = new Map<string, Lancamento[]>();
  lancamentos.forEach((entry) => {
    for (const docId of getIds(entry)) {
      const current = launchesByDocumentId.get(docId) ?? [];
      current.push(entry);
      launchesByDocumentId.set(docId, current);
    }
  });
  const totalPontos = sumPointValues(lancamentos.map((entry) => entry.pontos_calculados));
  const itensDistintos = getDistinctRscCriterionCount(lancamentos, itensRSC);

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
    '',
    '6. PRESIDENCIA DE COMISSAO/NUCLEO NAO NOMEADA EXPRESSAMENTE:',
    '   Muitas portarias de designacao nao escrevem "Presidente: [Nome]" ao lado do servidor — o texto introdutorio costuma atribuir a presidencia ao primeiro nomeado da relacao (ex.: "sob a presidencia do primeiro", "cabendo a presidencia ao primeiro relacionado"). Antes de sinalizar um item de coordenacao/presidencia como indevido, verifique se o servidor e o primeiro nomeado da lista, na ordem do documento (nao alfabetica); se for, a presidencia esta corretamente comprovada mesmo sem citacao expressa ao lado do nome.',
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
    'Cada documento recebe a mesma numeracao exibida na aba Documentos do sistema (Documento 1, Documento 2 etc.).',
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

  const launches = sortLancamentosByDossierOrder(lancamentos, itensRSC);

  const launchesBlock = [
    '=== LANCAMENTOS DECLARADOS ===',
    '',
    ...launches.flatMap((entry, index) => {
      const item = itensById.get(entry.item_rsc_id);
      const docIds = getIds(entry);
      const docs = docIds.map((id) => docsById.get(id)).filter((doc): doc is Documento => !!doc);
      const docsStr = docs.length
        ? docs.map((doc) => `${docKeys.get(doc.id) ?? doc.id} - ${doc.nome_arquivo}`).join('; ')
        : 'Sem documento vinculado';
      return [
        '------------------------------------------------------------',
        `LANCAMENTO ${index + 1}: ${itemCode(item)}`,
        `Item para ajuste   : ${itemReference(item)}`,
        `Item oficial       : ${item?.descricao ?? 'Item nao encontrado na tabela oficial'}`,
        `Inciso             : ${item?.inciso ?? 'Nao identificado'}`,
        `Modo de calculo    : ${item?.modo_calculo ?? 'Nao informado'}`,
        `Unidade de medida  : ${item?.unidade_medida ?? 'Nao informada'}`,
        `Pontuacao oficial  : ${item ? `${formatPointValue(item.pontos_por_unidade)} pts por ${item.unidade_medida}` : 'Nao mapeada'}`,
        `Quantidade         : ${entry.quantidade_informada}`,
        `Periodo declarado  : ${formatDateRange(entry)}`,
        `Pontos declarados  : ${formatPointValue(entry.pontos_calculados)}`,
        `Documento(s) vinculado(s): ${docsStr}`,
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
    '## Plano de Acao para Corrigir a Documentacao',
    'Esta e a secao MAIS IMPORTANTE para o servidor. Escreva um passo a passo simples e didatico,',
    'em linguagem acessivel (o leitor NAO e especialista em RSC nem em termos juridicos),',
    'explicando exatamente o que ele deve fazer DENTRO DO SISTEMA para deixar a documentacao correta.',
    '',
    'Regras para o plano de acao:',
    '- Se NAO houver nenhum problema, escreva apenas: "Nenhuma correcao necessaria. Sua documentacao esta pronta para exportacao." e nao invente passos.',
    '- Se houver problemas, numere os passos em ordem de prioridade (1., 2., 3...), um passo por problema encontrado na tabela de conflitos.',
    '- Cada passo deve dizer: (a) O QUE fazer (ex.: excluir, substituir, anexar, corrigir data ou quantidade); (b) ONDE fazer (cite o item do sistema, ex.: "abra a aba Itens e localize o II-11 - Item 11"); (c) QUAL documento esta envolvido (cite a chave Documento N e o nome do arquivo); (d) POR QUE isso e necessario, em uma frase simples.',
    '- ATENCAO AO TIPO DE CORRECAO: Verifique o campo "Modo de calculo" de cada lancamento. Para itens com modo_calculo "manual" (ex.: Por designacao, Por premio, Por projeto, Por produto), a pontuacao depende da QUANTIDADE, nao de datas. Nao recomende correcao de datas para esses itens; se a contagem estiver errada, recomende corrigir a quantidade. Para itens com modo_calculo "auto_ano_fracao" ou "auto_mes" (ex.: Por ano ou fracao), a pontuacao depende de PERIODOS; nestes casos, recomende correcao de datas.',
    '- Exemplo de passo bem escrito: "1. Exclua o lancamento duplicado do item I-3 - Item 3: os Documentos 4 e 7 tratam da mesma comissao, entao apenas um pode pontuar. Mantenha o mais recente e remova o outro lancamento na aba Itens."',
    '- Ao final do plano, acrescente uma frase de fechamento indicando o que o servidor deve fazer depois das correcoes (ex.: rodar novamente esta auditoria e so entao gerar o pacote final).',
  ].join('\n');

  return [header, '', serverBlock, '', documentBlock, '', launchesBlock, '', responseFormat].join('\n');
}
