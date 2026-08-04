/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  buildInstrucaoSipac,
  getDocumentosExportadosEsperados,
  CODIGO_CONARQ_RSC_PCCTAE,
} from './instrucaoSipac';
import type { Documento, Servidor } from '../data/mock';

const servidor: Servidor = {
  id: 'srv-1',
  siape: '1234567',
  nome_completo: 'Maria da Silva',
  lotacao: 'Campus Central',
  escolaridade_atual: 'Graduação',
  situacao_funcional: 'Ativo',
  cargo: 'Assistente em Administração',
  nivel_classificacao: 'D',
};

const ARQUIVOS_COMPLETOS = [
  '01_Requerimento_RSC.pdf',
  '02_Memorial_RSC.pdf',
  '03_Fichas_Funcionais_SIAPE.pdf',
  '04_Portaria_Estabilidade.pdf',
  '05_Portaria_Concessao_Anterior_RSC.pdf',
  '06_Documentos_Comprobatorios_Unificados.pdf',
  '07_Diploma_Certificado_Escolaridade.pdf',
];

const ARQUIVOS_SEM_05 = ARQUIVOS_COMPLETOS.filter((arquivo) => arquivo !== '05_Portaria_Concessao_Anterior_RSC.pdf');

describe('buildInstrucaoSipac', () => {
  it('monta o assunto detalhado com nível, nome e SIAPE', () => {
    const instrucao = buildInstrucaoSipac(servidor, { label: 'RSC-PCCTAE III' }, ARQUIVOS_COMPLETOS);
    const assunto = instrucao.secaoA.campos.find((campo) => campo.id === 'assunto-detalhado');
    expect(assunto?.valor).toBe(
      'Reconhecimento de Saberes e Competências – RSC-PCCTAE III – Maria da Silva – SIAPE 1234567',
    );
  });

  it('monta o assunto detalhado corretamente para um nível diferente', () => {
    const instrucao = buildInstrucaoSipac(servidor, { label: 'RSC-PCCTAE VI' }, ARQUIVOS_COMPLETOS);
    const assunto = instrucao.secaoA.campos.find((campo) => campo.id === 'assunto-detalhado');
    expect(assunto?.valor).toBe(
      'Reconhecimento de Saberes e Competências – RSC-PCCTAE VI – Maria da Silva – SIAPE 1234567',
    );
  });

  it('inclui a classificação CONARQ fixa na Seção A', () => {
    const instrucao = buildInstrucaoSipac(servidor, { label: 'RSC-PCCTAE I' }, ARQUIVOS_COMPLETOS);
    const conarq = instrucao.secaoA.campos.find((campo) => campo.id === 'classificacao-conarq');
    expect(conarq?.valor).toBe(CODIGO_CONARQ_RSC_PCCTAE);
    expect(CODIGO_CONARQ_RSC_PCCTAE).toBe('023.157');
  });

  it('inclui o interessado com nome e SIAPE do servidor', () => {
    const instrucao = buildInstrucaoSipac(servidor, { label: 'RSC-PCCTAE I' }, ARQUIVOS_COMPLETOS);
    const interessado = instrucao.secaoA.campos.find((campo) => campo.id === 'interessado');
    expect(interessado?.valor).toBe('Maria da Silva (SIAPE 1234567)');
  });

  it('a tabela de juntada reflete exatamente os arquivos passados, na ordem e quantidade recebidas', () => {
    const instrucao = buildInstrucaoSipac(servidor, { label: 'RSC-PCCTAE I' }, ARQUIVOS_COMPLETOS);
    expect(instrucao.secaoB.itens).toHaveLength(ARQUIVOS_COMPLETOS.length);
    expect(instrucao.secaoB.itens.map((item) => item.arquivo)).toEqual(ARQUIVOS_COMPLETOS);
    instrucao.secaoB.itens.forEach((item, index) => {
      expect(item.ordem).toBe(index + 1);
    });
  });

  it('inclui o documento 05 (concessão anterior) somente quando presente na lista recebida', () => {
    const comConcessaoAnterior = buildInstrucaoSipac(servidor, { label: 'RSC-PCCTAE I' }, ARQUIVOS_COMPLETOS);
    expect(comConcessaoAnterior.secaoB.itens.some((item) => item.arquivo === '05_Portaria_Concessao_Anterior_RSC.pdf')).toBe(true);

    const semConcessaoAnterior = buildInstrucaoSipac(servidor, { label: 'RSC-PCCTAE I' }, ARQUIVOS_SEM_05);
    expect(semConcessaoAnterior.secaoB.itens.some((item) => item.arquivo === '05_Portaria_Concessao_Anterior_RSC.pdf')).toBe(false);
    expect(semConcessaoAnterior.secaoB.itens).toHaveLength(ARQUIVOS_SEM_05.length);
  });

  it('atribui tipo de documento e natureza sugerida conhecidos para cada arquivo catalogado', () => {
    const instrucao = buildInstrucaoSipac(servidor, { label: 'RSC-PCCTAE I' }, ARQUIVOS_COMPLETOS);
    const requerimento = instrucao.secaoB.itens.find((item) => item.arquivo === '01_Requerimento_RSC.pdf');
    expect(requerimento).toMatchObject({ tipoDocumentoSipac: 'Requerimento', naturezaSugerida: 'Ostensivo' });

    const comprovantes = instrucao.secaoB.itens.find(
      (item) => item.arquivo === '06_Documentos_Comprobatorios_Unificados.pdf',
    );
    expect(comprovantes).toMatchObject({ tipoDocumentoSipac: 'Comprovante', naturezaSugerida: 'Restrito' });
  });

  it('inclui a Seção C com avisos fixos e a data de vigência', () => {
    const instrucao = buildInstrucaoSipac(servidor, { label: 'RSC-PCCTAE I' }, ARQUIVOS_COMPLETOS);
    expect(instrucao.secaoC.avisos).toContain('Anexe todos os documentos, na ordem indicada.');
    expect(instrucao.secaoC.passos.length).toBeGreaterThan(0);
    expect(instrucao.dataVigencia).toBeTruthy();
  });

  // Plano de ação 2026-08-04, P2: orientação para evitar o problema relatado
  // em reunião (PDF comprimido externamente virou imagem, sem texto extraível).
  it('avisa para não compactar o PDF externamente antes de anexar no SIPAC', () => {
    const instrucao = buildInstrucaoSipac(servidor, { label: 'RSC-PCCTAE I' }, ARQUIVOS_COMPLETOS);
    const avisoCompactacao = instrucao.secaoC.avisos.find((a) => /compacta/i.test(a));
    expect(avisoCompactacao).toBeDefined();
    expect(avisoCompactacao).toMatch(/imagens?/i);
  });
});

describe('getDocumentosExportadosEsperados', () => {
  const baseDoc: Documento = {
    id: 'doc-1',
    servidor_id: servidor.id,
    nome_arquivo: 'arquivo.pdf',
    data_upload: '2026-01-01T00:00:00.000Z',
    caminho_storage: 'storage/arquivo.pdf',
  };

  it('inclui o 05 quando há documento de portaria de concessão anterior anexado', () => {
    const documentos: Documento[] = [
      { ...baseDoc, id: 'd1', categoria_instrucao: 'siape_dados_funcionais' },
      { ...baseDoc, id: 'd2', categoria_instrucao: 'portaria_estabilidade' },
      { ...baseDoc, id: 'd3', categoria_instrucao: 'diploma_certificado_escolaridade' },
      { ...baseDoc, id: 'd4', categoria_instrucao: 'portaria_concessao_anterior' },
    ];
    const arquivos = getDocumentosExportadosEsperados(documentos, servidor.id);
    expect(arquivos).toContain('05_Portaria_Concessao_Anterior_RSC.pdf');
  });

  it('omite o 05 quando não há documento de concessão anterior anexado', () => {
    const documentos: Documento[] = [
      { ...baseDoc, id: 'd1', categoria_instrucao: 'siape_dados_funcionais' },
      { ...baseDoc, id: 'd2', categoria_instrucao: 'portaria_estabilidade' },
      { ...baseDoc, id: 'd3', categoria_instrucao: 'diploma_certificado_escolaridade' },
    ];
    const arquivos = getDocumentosExportadosEsperados(documentos, servidor.id);
    expect(arquivos).not.toContain('05_Portaria_Concessao_Anterior_RSC.pdf');
    expect(arquivos).toEqual([
      '01_Requerimento_RSC.pdf',
      '02_Memorial_RSC.pdf',
      '03_Fichas_Funcionais_SIAPE.pdf',
      '04_Portaria_Estabilidade.pdf',
      '06_Documentos_Comprobatorios_Unificados.pdf',
      '07_Diploma_Certificado_Escolaridade.pdf',
    ]);
  });

  it('ignora documentos de outro servidor', () => {
    const documentos: Documento[] = [
      { ...baseDoc, id: 'd1', servidor_id: 'outro-servidor', categoria_instrucao: 'portaria_concessao_anterior' },
    ];
    const arquivos = getDocumentosExportadosEsperados(documentos, servidor.id);
    expect(arquivos).not.toContain('05_Portaria_Concessao_Anterior_RSC.pdf');
  });
});
