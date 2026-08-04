/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Instrução determinística do processo no SIPAC.
 *
 * Depois que o servidor monta o dossiê (pacote ZIP), a etapa seguinte —
 * criar e instruir o processo no SIPAC — era feita totalmente às cegas.
 * Este módulo é uma função pura que devolve o roteiro (cadastro, ordem de
 * juntada e passo a passo) a partir do estado já existente na sessão. Não
 * gera nenhum arquivo novo, não persiste nada e não altera o fluxo de
 * exportação do ZIP (`pacoteExport.ts`) — é puramente derivado dele.
 */

import type { Documento, Servidor } from '../data/mock';

/** Classificação CONARQ para processos de RSC-PCCTAE (espelho de `avaliador-RSC-TAE/src/lib/conarq.ts`). */
export const CODIGO_CONARQ_RSC_PCCTAE = '023.157';

/**
 * Data de vigência deste roteiro de instrução. Os tipos de documento, telas
 * e naturezas do SIPAC são definidos pela prática institucional (PRODI/DGTI/
 * CPGPE), fora do controle deste sistema — por isso o texto fica com data
 * exibida no rodapé do modal, para que fique claro quando foi validado pela
 * última vez.
 */
export const DATA_VIGENCIA_INSTRUCAO_SIPAC = '02 de agosto de 2026';

/** Nível pleiteado — apenas os campos usados por este módulo. */
export type NivelPleiteadoInstrucao = {
  label: string;
};

export interface CampoCadastroSipac {
  id: string;
  campo: string;
  valor: string;
}

export interface ItemJuntadaSipac {
  ordem: number;
  arquivo: string;
  tipoDocumentoSipac: string;
  naturezaSugerida: string;
}

export interface InstrucaoSipac {
  secaoA: {
    titulo: string;
    campos: CampoCadastroSipac[];
  };
  secaoB: {
    titulo: string;
    itens: ItemJuntadaSipac[];
  };
  secaoC: {
    titulo: string;
    passos: string[];
    avisos: string[];
  };
  dataVigencia: string;
}

/**
 * Mapa fixo de arquivo do ZIP → tipo de documento e natureza sugerida no
 * SIPAC. Reflete a mesma composição de `exportPacoteRSC` (`pacoteExport.ts`),
 * sem duplicar sua lógica de geração de PDF — apenas os nomes de arquivo,
 * que são contrato estável entre os dois módulos.
 *
 * Tipos e naturezas a validar com a prática da PRODI/CPGPE antes de fixar
 * definitivamente os textos (ver plano §6).
 */
const CATALOGO_JUNTADA: Record<string, { tipoDocumentoSipac: string; naturezaSugerida: string }> = {
  '01_Requerimento_RSC.pdf': { tipoDocumentoSipac: 'Requerimento', naturezaSugerida: 'Ostensivo' },
  '02_Memorial_RSC.pdf': { tipoDocumentoSipac: 'Memorial', naturezaSugerida: 'Ostensivo' },
  '03_Fichas_Funcionais_SIAPE.pdf': { tipoDocumentoSipac: 'Ficha funcional', naturezaSugerida: 'Restrito' },
  '04_Portaria_Estabilidade.pdf': { tipoDocumentoSipac: 'Portaria', naturezaSugerida: 'Ostensivo' },
  '05_Portaria_Concessao_Anterior_RSC.pdf': { tipoDocumentoSipac: 'Portaria', naturezaSugerida: 'Ostensivo' },
  '06_Documentos_Comprobatorios_Unificados.pdf': { tipoDocumentoSipac: 'Comprovante', naturezaSugerida: 'Restrito' },
  '07_Diploma_Certificado_Escolaridade.pdf': { tipoDocumentoSipac: 'Diploma/Certificado', naturezaSugerida: 'Restrito' },
};

/** Ordem canônica de juntada — mesma ordem numérica dos nomes de arquivo do ZIP. */
const ORDEM_ARQUIVOS = Object.keys(CATALOGO_JUNTADA);

/**
 * Deriva, a partir dos documentos de instrução já anexados na sessão, a
 * lista de arquivos que `exportPacoteRSC` efetivamente incluirá no ZIP —
 * inclusive a presença/ausência do `05_Portaria_Concessao_Anterior_RSC.pdf`,
 * que é opcional (só existe quando há concessão anterior de RSC informada).
 *
 * Esta função NÃO gera nenhum PDF nem toca em `pacoteExport.ts`; apenas
 * espelha, para fins de exibição no modal, a mesma condição de presença que
 * `exportPacoteRSC` usa para decidir se inclui cada arquivo de instrução.
 */
export function getDocumentosExportadosEsperados(
  documentos: Documento[],
  servidorId: string,
): string[] {
  const categorias = new Set(
    documentos
      .filter((doc) => doc.servidor_id === servidorId && doc.categoria_instrucao && doc.caminho_storage)
      .map((doc) => doc.categoria_instrucao),
  );

  const temSiape =
    categorias.has('siape_dados_funcionais') ||
    categorias.has('siape_posicao_carreira') ||
    categorias.has('siape_cargo_confianca');

  const arquivos = ['01_Requerimento_RSC.pdf', '02_Memorial_RSC.pdf'];
  if (temSiape) arquivos.push('03_Fichas_Funcionais_SIAPE.pdf');
  if (categorias.has('portaria_estabilidade')) arquivos.push('04_Portaria_Estabilidade.pdf');
  if (categorias.has('portaria_concessao_anterior')) arquivos.push('05_Portaria_Concessao_Anterior_RSC.pdf');
  arquivos.push('06_Documentos_Comprobatorios_Unificados.pdf');
  if (categorias.has('diploma_certificado_escolaridade')) arquivos.push('07_Diploma_Certificado_Escolaridade.pdf');

  return arquivos.sort((a, b) => ORDEM_ARQUIVOS.indexOf(a) - ORDEM_ARQUIVOS.indexOf(b));
}

const AVISOS_FIXOS = [
  'Não renomeie os arquivos do ZIP (os nomes são contrato com o sistema avaliador).',
  'Não edite os PDFs gerados (eles carregam marcações internas que guiam a avaliação).',
  'Anexe todos os documentos, na ordem indicada.',
  'Não remova nenhuma página dos PDFs gerados — inclusive a página final "EXTRATO ESTRUTURADO DE DADOS" do Memorial, que é parte integrante do documento.',
  'Se o ZIP trouxer os documentos comprobatórios divididos em partes (06_..._parte-1-de-N.pdf), anexe TODAS as partes, na ordem numerada.',
  'Não passe o PDF gerado por ferramentas externas de compactação antes de anexar no SIPAC — isso costuma transformar o PDF em uma sequência de imagens, o que impede a extração de texto (nem você nem a IA do avaliador conseguem mais ler o conteúdo). Se algum arquivo ainda assim exceder o limite do SIPAC, o próprio sistema já divide o caderno de comprovantes em partes automaticamente.',
  'Prefira documentos escaneados com boa resolução e, se possível, já com OCR (texto pesquisável) — fotos ou digitalizações de baixa qualidade também prejudicam a leitura automática do conteúdo.',
];

const PASSOS_FIXOS = [
  'Acesse a Mesa Virtual do SIPAC com seu usuário e senha institucionais.',
  'Selecione "Cadastrar Processo" (Módulo Protocolo).',
  'Preencha os dados do processo com a Classificação CONARQ e o Assunto detalhado da Seção A deste roteiro.',
  'Informe o Interessado e a Natureza do processo conforme a Seção A.',
  'Salve o cadastro do processo e abra a opção de juntada de documentos.',
  'Junte cada arquivo do pacote ZIP na ordem exata da Seção B, escolhendo o Tipo de documento e a Natureza sugeridos para cada um.',
  'Confira se todos os arquivos da Seção B foram juntados antes de prosseguir.',
  'Movimente o processo para a unidade da comissão responsável pela análise do RSC-PCCTAE.',
];

/**
 * Função pura: devolve o roteiro de instrução do SIPAC (3 seções) a partir
 * do servidor, do nível pleiteado e dos documentos efetivamente exportados
 * (ou que serão exportados) no ZIP. Mesmos dados de entrada, mesmo texto de
 * saída — nada de aleatoriedade, nada de estado externo.
 */
export function buildInstrucaoSipac(
  servidor: Servidor,
  nivel: NivelPleiteadoInstrucao | null | undefined,
  documentosExportados: string[],
): InstrucaoSipac {
  const nivelLabel = nivel?.label ?? '____';
  const assunto = `Reconhecimento de Saberes e Competências – ${nivelLabel} – ${servidor.nome_completo} – SIAPE ${servidor.siape}`;

  const campos: CampoCadastroSipac[] = [
    { id: 'classificacao-conarq', campo: 'Classificação CONARQ', valor: CODIGO_CONARQ_RSC_PCCTAE },
    { id: 'assunto-detalhado', campo: 'Assunto detalhado', valor: assunto },
    {
      id: 'interessado',
      campo: 'Interessado',
      valor: `${servidor.nome_completo} (SIAPE ${servidor.siape})`,
    },
    {
      id: 'natureza',
      campo: 'Natureza',
      valor: 'Ostensivo, com documentos restritos conforme a tabela de ordem de juntada (Seção B)',
    },
  ];

  const itens: ItemJuntadaSipac[] = documentosExportados.map((arquivo, index) => {
    const catalogado = CATALOGO_JUNTADA[arquivo];
    return {
      ordem: index + 1,
      arquivo,
      tipoDocumentoSipac: catalogado?.tipoDocumentoSipac ?? 'Documento',
      naturezaSugerida: catalogado?.naturezaSugerida ?? 'Ostensivo',
    };
  });

  return {
    secaoA: {
      titulo: 'Cadastro do processo no SIPAC',
      campos,
    },
    secaoB: {
      titulo: 'Ordem de juntada',
      itens,
    },
    secaoC: {
      titulo: 'Passo a passo',
      passos: PASSOS_FIXOS,
      avisos: AVISOS_FIXOS,
    },
    dataVigencia: DATA_VIGENCIA_INSTRUCAO_SIPAC,
  };
}
