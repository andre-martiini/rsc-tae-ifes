import { describe, it, expect } from 'vitest';
import { deveAvisarQuantidadeDuplicada, somarQuantidadeLancada } from './quantidadeDuplicada';

describe('deveAvisarQuantidadeDuplicada', () => {
  it('avisa quando o novo lançamento repete o total do item com um único comprovante', () => {
    // Caso real: item já tem 1 lançamento com 5 designações; o servidor cria
    // um segundo lançamento repetindo a quantidade total (5) com 1 documento.
    expect(deveAvisarQuantidadeDuplicada('manual', [{ quantidade_informada: 5 }], 5, 1)).toBe(true);
  });

  it('não avisa quando o item ainda não tem nenhum lançamento', () => {
    expect(deveAvisarQuantidadeDuplicada('manual', [], 5, 1)).toBe(false);
  });

  it('não avisa quando a quantidade acompanha o número de comprovantes novos', () => {
    expect(deveAvisarQuantidadeDuplicada('manual', [{ quantidade_informada: 5 }], 1, 1)).toBe(false);
    expect(deveAvisarQuantidadeDuplicada('manual', [{ quantidade_informada: 5 }], 3, 3)).toBe(false);
  });

  it('nunca avisa em itens de contagem automática', () => {
    expect(deveAvisarQuantidadeDuplicada('auto_ano_fracao', [{ quantidade_informada: 5 }], 5, 1)).toBe(false);
    expect(deveAvisarQuantidadeDuplicada('auto_mes', [{ quantidade_informada: 5 }], 99, 0)).toBe(false);
  });

  it('ignora quantidades inválidas', () => {
    expect(deveAvisarQuantidadeDuplicada('manual', [{ quantidade_informada: 5 }], Number.NaN, 1)).toBe(false);
    expect(deveAvisarQuantidadeDuplicada('manual', [{ quantidade_informada: 5 }], 0, 1)).toBe(false);
  });
});

describe('somarQuantidadeLancada', () => {
  it('soma as quantidades dos lançamentos existentes', () => {
    expect(somarQuantidadeLancada([{ quantidade_informada: 5 }, { quantidade_informada: 2.5 }])).toBe(7.5);
  });

  it('devolve zero para lista vazia', () => {
    expect(somarQuantidadeLancada([])).toBe(0);
  });
});
