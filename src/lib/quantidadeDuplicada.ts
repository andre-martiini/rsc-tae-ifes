/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Guard contra dupla contagem de QUANTIDADE em um mesmo item do rol.
 *
 * Caso real que originou este módulo: um servidor tinha um item com 5
 * designações comprovadas (4 portarias + 1 declaração que listava as 5).
 * O Assistente gerou DOIS lançamentos do mesmo item, cada um declarando a
 * quantidade TOTAL (5). Quando o avaliador aprovou os dois, o item pontuou
 * 22,5 + 22,5 = 45 em vez de 22,5.
 *
 * A regra do rol é: o total do item é a SOMA das quantidades de todos os
 * seus lançamentos. Portanto, cada novo lançamento deve declarar apenas as
 * unidades NOVAS que ele traz — nunca o total acumulado do item.
 *
 * Isto é um AVISO educativo, nunca um bloqueio: um único comprovante pode
 * legitimamente provar várias unidades (uma portaria única que lista 5
 * designações, por exemplo). Por isso a heurística é deliberadamente frouxa
 * e sempre dispensável pelo usuário.
 */

export interface LancamentoQuantidade {
  quantidade_informada: number;
}

/**
 * Decide se o usuário deve ver o aviso de quantidade possivelmente duplicada
 * ao criar um NOVO lançamento para um item que já tem lançamentos.
 *
 * Dispara quando, cumulativamente:
 *  - o item é de contagem manual (em itens automáticos a quantidade é
 *    derivada dos períodos, não digitada — não há como o usuário repetir o
 *    total por engano);
 *  - o item já possui ao menos um lançamento;
 *  - a quantidade digitada excede o número de comprovantes novos anexados
 *    (com piso 1, porque um lançamento sem arquivo físico ainda vale 1).
 *
 * @param modoCalculo   `item.modo_calculo` do item do rol.
 * @param itemLancamentos Lançamentos JÁ existentes deste item (sem o novo).
 * @param quantidade    Quantidade que o usuário está digitando no novo lançamento.
 * @param docsNovos     Quantidade de comprovantes anexados a este novo lançamento.
 */
export function deveAvisarQuantidadeDuplicada(
  modoCalculo: string,
  itemLancamentos: LancamentoQuantidade[],
  quantidade: number,
  docsNovos: number,
): boolean {
  if (modoCalculo !== 'manual') return false;
  if (!itemLancamentos || itemLancamentos.length === 0) return false;
  if (!Number.isFinite(quantidade) || quantidade <= 0) return false;

  return quantidade > Math.max(1, docsNovos);
}

/** Soma as quantidades já lançadas no item (base do texto do aviso). */
export function somarQuantidadeLancada(itemLancamentos: LancamentoQuantidade[]): number {
  return (itemLancamentos ?? []).reduce(
    (soma, entrada) => soma + (Number.isFinite(entrada.quantidade_informada) ? entrada.quantidade_informada : 0),
    0,
  );
}
