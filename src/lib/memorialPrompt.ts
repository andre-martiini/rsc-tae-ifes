import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import {
  buildDossierDocumentOrder,
  formatDossierDocumentLabel,
  getLancamentoDocumentIds,
  sortDocumentsByDossierOrder,
  sortLancamentosByDossierOrder,
} from './documentOrdering';
import { periodosDoLancamento } from './periodos';
import { formatPointValue } from './points';
import { formatarDataSegura } from './utils';

type NivelResumo = {
  id?: string;
  label?: string;
  equivalencia?: string;
} | null;

type MemorialPromptParams = {
  servidor: Servidor;
  nivelPleiteado: NivelResumo;
  processo: ProcessoRSC;
  lancamentos: Lancamento[];
  itensRSC: ItemRSC[];
  documentos: Documento[];
};

function cleanText(value?: string) {
  return (value ?? '')
    .replace(/\[RSC:[A-Z_]+:[^\]]+\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function formatPeriods(lancamento: Lancamento) {
  const periods = periodosDoLancamento(lancamento);
  if (periods.length === 0) return 'não informado';
  return periods
    .map((period) => `${formatarDataSegura(period.inicio, 'não informado')} a ${formatarDataSegura(period.fim, 'não informado')}`)
    .join('; ');
}

export function gerarPromptMemorial(params: MemorialPromptParams) {
  const { servidor, nivelPleiteado, processo, lancamentos, itensRSC, documentos } = params;
  const docsById = new Map(documentos.map((doc) => [doc.id, doc]));
  const itemsById = new Map(itensRSC.map((item) => [item.id, item]));
  const documentOrder = buildDossierDocumentOrder({ lancamentos, itensRSC });
  const usedIds = Array.from(new Set(lancamentos.flatMap(getLancamentoDocumentIds)));
  const usedDocs = sortDocumentsByDossierOrder(
    usedIds.map((id) => docsById.get(id)).filter((doc): doc is Documento => !!doc),
    documentOrder,
  );
  const docLabels = new Map(
    usedDocs.map((doc) => {
      const entry = documentOrder.get(doc.id);
      return [doc.id, entry ? formatDossierDocumentLabel(entry.index) : doc.nome_arquivo];
    }),
  );

  const instruction = [
    'Você é um redator técnico especializado em memoriais profissionais do RSC-PCCTAE.',
    '',
    'Redija uma MINUTA DE MEMORIAL em primeira pessoa, em português do Brasil, com linguagem formal, clara, breve e objetiva.',
    'Use exclusivamente os dados fornecidos abaixo. Não invente datas, resultados, impactos, responsabilidades, competências ou vínculos causais.',
    'O texto deve ser um documento final e completo: NUNCA deixe trechos entre colchetes, marcadores do tipo "[completar: ...]" ou lacunas para o servidor preencher. Quando um detalhe específico (como impacto, ganho de eficiência ou aplicação prática) não estiver explícito nos dados, redija uma frase genérica e coerente que contextualize a contribuição da atividade, sem criar fatos e sem deixar espaços vazios.',
    'Mantenha o texto simplificado e enxuto: NÃO enumere exaustivamente números de portarias, processos licitatórios ou referências normativas individuais. Quando houver vários atos do mesmo tipo, agrupe-os em uma descrição geral (ex.: "designado por atos institucionais" ou "por meio de diversas portarias"). Cite números específicos apenas quando forem essenciais para a compreensão do fato.',
    'Prefira uma narrativa fluida e resumida em vez de listas detalhadas. Foque nos saberes, competências e resultados demonstrados, não no detalhamento administrativo de cada designação.',
    '',
    'BASE LEGAL A OBSERVAR',
    '- Decreto nº 13.048/2026, art. 13, II e § 1º.',
    '- O memorial deve descrever a trajetória profissional e individual desenvolvida ao longo da carreira.',
    '- Deve relacionar atividades e experiências aos requisitos I a VI do art. 3º.',
    '- Deve demonstrar saberes, competências e experiências ligados ao nível pleiteado.',
    '- Deve explicar como o conjunto da trajetória se alinha ao padrão de conhecimentos e competências que justifica o reconhecimento naquele nível.',
    '- Não transforme o memorial em tabela de pontuação: a listagem dos critérios já integra o requerimento.',
    '- Evite dados pessoais desnecessários, pois o memorial poderá ser publicado antes da decisão, respeitada a LGPD.',
    '',
    'ESTRUTURA OBRIGATÓRIA DA MINUTA',
    '1. Apresentação e síntese da trajetória profissional.',
    '2. Desenvolvimento em ordem cronológica ou temática, conectando as principais atividades aos requisitos legais aplicáveis.',
    '3. Para cada conjunto relevante, explique os saberes e competências demonstrados e a contribuição para a atuação do servidor ou para os resultados institucionais.',
    '4. Conclusão que demonstre, sem afirmar deferimento automático, por que a trajetória apresentada se alinha ao nível de RSC-PCCTAE pleiteado.',
    '',
    'Entregue somente o texto do memorial, sem notas introdutórias, tabela, contagem de pontos ou lista de documentos ao final.',
  ].join('\n');

  const serverBlock = [
    '=== DADOS DO SERVIDOR E DO PEDIDO ===',
    `Nome: ${servidor.nome_completo || 'não informado'}`,
    `Cargo: ${servidor.cargo || 'não informado'}`,
    `Lotação: ${servidor.lotacao || 'não informada'}`,
    `Início do efetivo exercício: ${formatarDataSegura(servidor.data_ingresso_ife || servidor.data_ingresso, 'não informado')}`,
    `Nível pleiteado: ${nivelPleiteado?.label ?? processo.nivel_pleiteado_id ?? 'não definido'}`,
    `Equivalência: ${nivelPleiteado?.equivalencia ?? 'não informada'}`,
  ].join('\n');

  const launchBlock = [
    '=== ATIVIDADES E EXPERIÊNCIAS DECLARADAS ===',
    ...sortLancamentosByDossierOrder(lancamentos, itensRSC).flatMap((lancamento, index) => {
      const item = itemsById.get(lancamento.item_rsc_id);
      const documentNames = getLancamentoDocumentIds(lancamento)
        .map((id) => {
          const doc = docsById.get(id);
          return doc ? `${docLabels.get(id) ?? 'Documento'}: ${doc.nome_arquivo}` : 'documento não encontrado';
        })
        .join('; ');
      return [
        '',
        `Atividade ${index + 1}`,
        `Requisito legal: ${item?.inciso ?? 'não mapeado'}`,
        `Critério específico: Item ${item?.numero ?? 'não mapeado'} - ${item?.descricao ?? lancamento.item_rsc_id}`,
        `Período: ${formatPeriods(lancamento)}`,
        `Quantidade declarada: ${lancamento.quantidade_informada ?? 'não informada'} ${item?.unidade_medida ?? ''}`.trim(),
        `Pontuação organizada no requerimento: ${formatPointValue(lancamento.pontos_calculados)}`,
        `Descrição/observação do servidor: ${cleanText(lancamento.observacao) || 'não informada'}`,
        `Contexto do fato gerador: ${cleanText(lancamento.fato_gerador_descricao) || 'não informado'}`,
        `Documentos relacionados: ${documentNames || 'nenhum documento localizado'}`,
      ];
    }),
  ].join('\n');

  const documentBlock = [
    '=== CONTEÚDO DOS DOCUMENTOS COMPROBATÓRIOS ===',
    'Use o conteúdo apenas para sustentar fatos presentes nos documentos. Texto ausente ou ilegível não autoriza inferências.',
    ...usedDocs.flatMap((doc) => [
      '',
      `${docLabels.get(doc.id) ?? 'Documento'} - ${doc.nome_arquivo}`,
      doc.transcricao?.trim()
        ? cleanText(doc.transcricao)
        : doc.gedoc_links?.length
          ? `Referência institucional sem transcrição local: ${doc.gedoc_links.join(', ')}`
          : '[Conteúdo não transcrito; não use este documento para criar fatos.]',
    ]),
  ].join('\n');

  return [instruction, '', serverBlock, '', launchBlock, '', documentBlock].join('\n');
}
