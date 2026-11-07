import { describe, expect, it } from 'vitest';
import { createRateLimiter, findExact, isValidNameQuery, normalizeName, shardOf, SHARD_COUNT, type ServidorRow } from './servidorLookup';

const row = (nome: string): ServidorRow => ({
  id: '1', nome, matricula: '232****', descricao_cargo: '', classe_cargo: '', cod_org_lotacao: '', org_lotacao: '', tipo_vinculo: '', situacao_vinculo: '',
});

describe('servidorLookup', () => {
  it('normaliza acentos e caixa', () => expect(normalizeName('  JOÃO  da Silva ')).toBe('joao da silva'));
  it('recusa consulta parcial ou de uma palavra', () => {
    expect(isValidNameQuery('joao')).toBe(false);
    expect(isValidNameQuery('joao da silva')).toBe(true);
  });
  it('shard é estável e dentro do intervalo', () => {
    const s = shardOf('joao da silva');
    expect(s).toBe(shardOf('joao da silva'));
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(SHARD_COUNT);
  });
  it('só devolve nome exato, nunca prefixo', () => {
    const rows = [row('JOÃO DA SILVA'), row('JOÃO DA SILVA JUNIOR')];
    expect(findExact(rows, 'joao da silva')).toHaveLength(1);
  });
  it('limita requisições por IP e libera após a janela', () => {
    let t = 0;
    const ok = createRateLimiter(2, 1000, () => t);
    expect([ok('a'), ok('a'), ok('a'), ok('b')]).toEqual([true, true, false, true]);
    t = 1500;
    expect(ok('a')).toBe(true);
  });
});
