import { describe, expect, it } from 'vitest';
import type { OperacaoAuditoria } from '../data/auditoria';
import { concluirVerificacao } from './auditoriaVerificacao';

describe('Concluir verificação', () => {
  it('grava verificada sem alterar lançamento nem documento', () => {
    const lancamento = { id: 'lanc-1', quantidade_informada: 1, comprovantes_ids: ['doc-1'] };
    const documento = { id: 'doc-1', nome_arquivo: 'certificado.pdf' };
    const lancamentoAntes = structuredClone(lancamento);
    const documentoAntes = structuredClone(documento);
    const operacao: OperacaoAuditoria = {
      id: 'op-1', tipo: 'sinalizar', lancamento_id: lancamento.id,
      severidade: 'baixa', justificativa: 'Leitura automática inconclusiva',
      status: 'pendente', origem: 'triagem', criada_em: '2026-01-01T00:00:00.000Z',
    };

    const concluida = concluirVerificacao(operacao);

    expect(concluida.status).toBe('verificada');
    expect(concluida).toEqual({ ...operacao, status: 'verificada' });
    expect(lancamento).toEqual(lancamentoAntes);
    expect(documento).toEqual(documentoAntes);
  });
});
