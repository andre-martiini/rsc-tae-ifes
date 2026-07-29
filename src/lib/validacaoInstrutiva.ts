/**
 * Validação Instrutiva de Documentos SIAPE no Assistente RSC-TAE (Seção 16 do Plano)
 * Causa identificada: O Assistente validava extensão/MIME, mas não o conteúdo textual.
 * Isso permitia que portarias de equipe fossem anexadas ao campo SIAPE e exportadas como '03_Fichas_Funcionais.pdf'.
 *
 * Esta validação analisa os três extratos SIAPE oficiais:
 * 1. CDCOINDFUN (Dados Individuais Funcionais)
 * 2. CACOPOSPRO (Progressão na Carreira)
 * 3. CACODETPFU (Cargo de Confiança e Função)
 */

export type EstadoValidacaoInstrutiva = 'compativel' | 'incompativel' | 'nao_foi_possivel_conferir';

export interface ResultadoValidacaoExtrato {
  extrato: 'CDCOINDFUN' | 'CACOPOSPRO' | 'CACODETPFU';
  tagEstrutural: string;
  estado: EstadoValidacaoInstrutiva;
  motivo: string;
  exigeJustificativaManual: boolean;
}

export interface ResultadoValidacaoDocumentoSIAPE {
  estadoAgregado: EstadoValidacaoInstrutiva;
  bloqueiaExportacao: boolean;
  extratos: {
    cdcoindfun: ResultadoValidacaoExtrato;
    cacopospro: ResultadoValidacaoExtrato;
    cacodetpfu: ResultadoValidacaoExtrato;
  };
  observacaoAuditavel?: string;
}

export function validarConteudoDocumentoSIAPE(textoDocumento: string): ResultadoValidacaoDocumentoSIAPE {
  const upper = textoDocumento.toUpperCase();

  // Detecção de conteúdo incompatível comprovado (ex: portarias administrativas de equipe)
  const ePortariaIncompativel =
    (upper.includes('PORTARIA') && upper.includes('EQUIPE DE TRABALHO')) ||
    (upper.includes('PORTARIA') && upper.includes('COMISSÃO ORGANIZADORA')) ||
    upper.includes('DESIGNAR SERVIDORES PARA COMPOSIÇÃO');

  if (ePortariaIncompativel) {
    const extratoIncompativel = (extrato: 'CDCOINDFUN' | 'CACOPOSPRO' | 'CACODETPFU', tag: string): ResultadoValidacaoExtrato => ({
      extrato,
      tagEstrutural: tag,
      estado: 'incompativel',
      motivo: `Documento anexado contém portarias administrativas e não o extrato SIAPE ${extrato}.`,
      exigeJustificativaManual: true,
    });

    return {
      estadoAgregado: 'incompativel',
      bloqueiaExportacao: true,
      extratos: {
        cdcoindfun: extratoIncompativel('CDCOINDFUN', '[EXTRATO_SIAPE_CDCOINDFUN]'),
        cacopospro: extratoIncompativel('CACOPOSPRO', '[EXTRATO_SIAPE_CACOPOSPRO]'),
        cacodetpfu: extratoIncompativel('CACODETPFU', '[EXTRATO_SIAPE_CACODETPFU]'),
      },
      observacaoAuditavel: 'Exportação bloqueada: Documento comprovadamente incompatível anexado ao campo SIAPE.',
    };
  }

  // Se o texto não puder ser conferido (ex: PDF digitalizado sem camada nativa)
  if (textoDocumento.trim().length < 50) {
    const extratoInconclusivo = (extrato: 'CDCOINDFUN' | 'CACOPOSPRO' | 'CACODETPFU', tag: string): ResultadoValidacaoExtrato => ({
      extrato,
      tagEstrutural: tag,
      estado: 'nao_foi_possivel_conferir',
      motivo: `Não foi possível extrair texto nativo para conferir o extrato ${extrato}.`,
      exigeJustificativaManual: true,
    });

    return {
      estadoAgregado: 'nao_foi_possivel_conferir',
      bloqueiaExportacao: false, // NÃO rejeita nem bloqueia automaticamente PDFs inconclusivos
      extratos: {
        cdcoindfun: extratoInconclusivo('CDCOINDFUN', '[EXTRATO_SIAPE_CDCOINDFUN]'),
        cacopospro: extratoInconclusivo('CACOPOSPRO', '[EXTRATO_SIAPE_CACOPOSPRO]'),
        cacodetpfu: extratoInconclusivo('CACODETPFU', '[EXTRATO_SIAPE_CACODETPFU]'),
      },
      observacaoAuditavel: 'PDF inconclusivo (sem texto nativo): Exige confirmação manual com justificativa.',
    };
  }

  // Conferência determinística dos 3 extratos
  const temCdcoindfun = upper.includes('CDCOINDFUN') || upper.includes('DADOS INDIVIDUAIS FUNCIONAIS');
  const temCacopospro = upper.includes('CACOPOSPRO') || upper.includes('PROGRESSÃO NA CARREIRA');
  const temCacodetpfu = upper.includes('CACODETPFU') || upper.includes('CARGO DE CONFIANÇA E FUNÇÃO');

  const cdcoindfun: ResultadoValidacaoExtrato = {
    extrato: 'CDCOINDFUN',
    tagEstrutural: '[EXTRATO_SIAPE_CDCOINDFUN]',
    estado: temCdcoindfun ? 'compativel' : 'nao_foi_possivel_conferir',
    motivo: temCdcoindfun ? 'Extrato CDCOINDFUN confirmado.' : 'Extrato CDCOINDFUN não localizado no texto.',
    exigeJustificativaManual: !temCdcoindfun,
  };

  const cacopospro: ResultadoValidacaoExtrato = {
    extrato: 'CACOPOSPRO',
    tagEstrutural: '[EXTRATO_SIAPE_CACOPOSPRO]',
    estado: temCacopospro ? 'compativel' : 'nao_foi_possivel_conferir',
    motivo: temCacopospro ? 'Extrato CACOPOSPRO confirmado.' : 'Extrato CACOPOSPRO não localizado no texto.',
    exigeJustificativaManual: !temCacopospro,
  };

  const cacodetpfu: ResultadoValidacaoExtrato = {
    extrato: 'CACODETPFU',
    tagEstrutural: '[EXTRATO_SIAPE_CACODETPFU]',
    estado: temCacodetpfu ? 'compativel' : 'nao_foi_possivel_conferir',
    motivo: temCacodetpfu ? 'Extrato CACODETPFU confirmado.' : 'Extrato CACODETPFU não localizado no texto.',
    exigeJustificativaManual: !temCacodetpfu,
  };

  const states = [cdcoindfun.estado, cacopospro.estado, cacodetpfu.estado];
  let estadoAgregado: EstadoValidacaoInstrutiva = 'compativel';

  if (states.includes('incompativel')) {
    estadoAgregado = 'incompativel';
  } else if (states.includes('nao_foi_possivel_conferir')) {
    estadoAgregado = 'nao_foi_possivel_conferir';
  }

  return {
    estadoAgregado,
    bloqueiaExportacao: estadoAgregado === 'incompativel',
    extratos: {
      cdcoindfun,
      cacopospro,
      cacodetpfu,
    },
  };
}
