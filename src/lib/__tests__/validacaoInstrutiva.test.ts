import { describe, expect, it } from 'vitest';
import { validarConteudoDocumentoSIAPE } from '../validacaoInstrutiva';

describe('Assistente RSC-TAE — Validação Instrutiva de Fichas SIAPE (Seção 16 do Plano)', () => {
  it('valida os três extratos SIAPE (CDCOINDFUN, CACOPOSPRO, CACODETPFU) como compatíveis em texto correto', () => {
    const textoValido = `
      RELATÓRIO FUNCIONAL SIAPE
      CDCOINDFUN - DADOS INDIVIDUAIS FUNCIONAIS
      CACOPOSPRO - PROGRESSÃO NA CARREIRA
      CACODETPFU - CARGO DE CONFIANÇA E FUNÇÃO
    `;

    const res = validarConteudoDocumentoSIAPE(textoValido);
    expect(res.estadoAgregado).toBe('compativel');
    expect(res.bloqueiaExportacao).toBe(false);
    expect(res.extratos.cdcoindfun.tagEstrutural).toBe('[EXTRATO_SIAPE_CDCOINDFUN]');
  });

  it('bloqueia a exportação quando uma portaria de equipe de trabalho é anexada no lugar de fichas SIAPE', () => {
    const textoPortarias = `
      PORTARIA Nº 405/2024 - REITORIA / IFES
      DESIGNAR SERVIDORES PARA COMPOSIÇÃO DE EQUIPE DE TRABALHO
    `;

    const res = validarConteudoDocumentoSIAPE(textoPortarias);
    expect(res.estadoAgregado).toBe('incompativel');
    expect(res.bloqueiaExportacao).toBe(true);
    expect(res.extratos.cdcoindfun.exigeJustificativaManual).toBe(true);
  });

  it('não bloqueia automaticamente PDFs inconclusivos (texto curto ou digitalizado)', () => {
    const textoCurto = 'PDF digitalizado';

    const res = validarConteudoDocumentoSIAPE(textoCurto);
    expect(res.estadoAgregado).toBe('nao_foi_possivel_conferir');
    expect(res.bloqueiaExportacao).toBe(false);
  });
});
