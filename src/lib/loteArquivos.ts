/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Divisão do caderno de comprovantes em lotes que respeitem o limite de
 * tamanho por arquivo aceito na protocolização.
 *
 * Motivação: o `06_Documentos_Comprobatorios_Unificados.pdf` reúne TODOS os
 * comprovantes do servidor num único PDF. Dossiês com muitos documentos
 * digitalizados (PDFs de scanner, fotos convertidas) passam com folga de
 * dezenas de MB, e o anexo é recusado no protocolo.
 *
 * Por que dividir em vez de comprimir: o merge é feito com pdf-lib, que copia
 * os fluxos de conteúdo das páginas de origem praticamente na íntegra. Ela não
 * recomprime imagens já embutidas nos PDFs de entrada — que é exatamente onde
 * está o peso de um documento escaneado. Comprimir de verdade exigiria
 * rasterizar e reencodar cada página (custo alto no navegador e perda de
 * qualidade em documento probatório). Dividir preserva os bytes originais.
 *
 * ATENÇÃO — o limite abaixo é uma restrição institucional do SIPAC informada
 * pela equipe do produto. Não foi possível confirmá-la na documentação deste
 * repositório; se o valor real for outro, é só ajustar esta constante.
 */
export const LIMITE_TAMANHO_ARQUIVO_BYTES = 35 * 1024 * 1024;

/**
 * Agrupa itens em lotes sequenciais cujo tamanho somado não ultrapassa
 * `limite`, usando estratégia gulosa: acumula no lote corrente até que o
 * próximo item estouraria o limite, então fecha o lote e começa outro.
 *
 * Um item NUNCA é dividido entre dois lotes — no caderno de comprovantes,
 * cada item é um documento inteiro, e cortá-lo ao meio quebraria a referência
 * de páginas do Memorial e a leitura humana do documento. Como consequência,
 * um item individualmente maior que o limite ocupa um lote sozinho e esse
 * lote excede o limite; cabe ao chamador avisar o usuário nesse caso.
 */
export function dividirEmLotes<T>(
  itens: T[],
  tamanhoDoItem: (item: T) => number,
  limite: number,
): T[][] {
  const lotes: T[][] = [];
  let loteAtual: T[] = [];
  let acumulado = 0;

  for (const item of itens) {
    const tamanho = Math.max(0, tamanhoDoItem(item));

    if (loteAtual.length > 0 && acumulado + tamanho > limite) {
      lotes.push(loteAtual);
      loteAtual = [];
      acumulado = 0;
    }

    loteAtual.push(item);
    acumulado += tamanho;
  }

  if (loteAtual.length > 0) lotes.push(loteAtual);
  return lotes;
}

/**
 * Nome de arquivo de uma parte do caderno de comprovantes.
 *
 * Mantém o prefixo `06_` da convenção do ZIP para que a ordem de juntada no
 * SIPAC continue óbvia, e traz "parte-N-de-M" para que o servidor perceba de
 * imediato que precisa anexar todas as partes.
 */
export function nomeParteComprovantes(parte: number, total: number): string {
  return `06_Documentos_Comprobatorios_Unificados_parte-${parte}-de-${total}.pdf`;
}
