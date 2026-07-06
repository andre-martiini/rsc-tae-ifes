import type { ItemRSC, Lancamento, Documento, Servidor } from '../data/mock';
import { formatarDataSegura } from './utils';
import { periodosDoLancamento } from './periodos';

export function generateLLMPrompt(params: {
    item: ItemRSC;
    lancamento: Lancamento;
    documento?: Documento;
    servidor?: Servidor | null;
}): string {
    const { item, lancamento, documento, servidor } = params;

    const periodosLanc = periodosDoLancamento(lancamento);
    const periodoStr =
        periodosLanc.length > 0
            ? periodosLanc
                  .map((p) => `${formatarDataSegura(p.inicio, 'Não informada')} até ${formatarDataSegura(p.fim, 'Não informada')}`)
                  .join('; ')
            : 'Não exigido para este item';

    const docInfo = documento
        ? `- Documento de referência: ${documento.nome_arquivo}`
        : '- Documento de referência: (Verifique o arquivo anexo)';

    const transcricaoInfo = documento?.transcricao
        ? `\n--- CONTEÚDO TRANSCRITO DO DOCUMENTO ---\n${documento.transcricao}\n--- FIM DA TRANSCRIÇÃO ---\n`
        : `\n(Nota: A transcrição detalhada do documento não está disponível neste prompt. Por favor, analise o arquivo PDF anexo para realizar a avaliação de mérito.)\n`;

    return `Contexto e Papel da IA: Você atua como um assistente técnico de apoio ao servidor na preparação documental do pedido de RSC-PCCTAE. Sua função é revisar a aderência do documento em anexo ao item informado, sem substituir análise institucional posterior.

Dados do Item Pleiteado:
- Descrição: ${item.descricao}
- Critério (Inciso): ${item.inciso}
- Regra de Pontuação: ${item.pontos_por_unidade} pontos por ${item.unidade_medida}

Dados do meu Lançamento:
- Servidor: ${servidor?.nome_completo || 'Não identificado'}
- Quantidade declarada: ${lancamento.quantidade_informada} ${item.unidade_medida}
- Período: ${periodoStr}
${docInfo}
${transcricaoInfo}

Regras do RSC-PCCTAE a serem observadas:
A) Documentos Válidos: A comprovação deve ocorrer por meios oficiais (portarias, certificados, diplomas, publicações, diários oficiais, atas, relatórios técnicos, declarações de conclusão/instrutoria, etc.).
B) Não duplicidade: a mesma documentação ou o mesmo fato comprovado não deve ser utilizado em duplicidade entre requisitos específicos.
C) Atribuição Ordinária: não podem ser pontuados fatos que representem exclusivamente atribuições legais do cargo, sem demonstração de saberes, competências, inovação, responsabilidade ampliada ou resultados institucionais relevantes.
D) Conformidade da Unidade: a comprovação deve preencher estritamente a unidade de medida (ex.: "Por designação" exige ato formal; "Por ano ou fração" exige comprovação temporal suficiente).

Tarefa para a IA:
Analise rigorosamente o documento fornecido em contraste com os dados declarados e responda aos seguintes pontos de verificação:
1. Validade e Legibilidade: O documento é oficial, válido e legível? A autoria e o servidor (${servidor?.nome_completo || 'Não identificado'}) estão devidamente identificados?
2. Temporalidade: As datas contidas no documento estão compreendidas ou cobrem o período informado (${periodoStr})?
3. Aderência ao Critério: A atividade descrita no documento comprova de forma inquestionável e exata a Descrição do Item (${item.descricao})?
4. Filtro de Atribuição Ordinária: A atividade demonstra uma competência/saber adicional ou há indícios de que seja apenas a execução da rotina básica obrigatória do cargo?
5. Métrica e Quantidade: A quantidade declarada de "${lancamento.quantidade_informada}" atende a métrica exigida pela unidade de medida ("${item.unidade_medida}") e pode ser comprovada no documento?
6. Não duplicidade: há indícios de que a documentação ou o mesmo fato comprovado esteja sendo reaproveitado em outro critério?

Resultado Esperado:
Ao final da análise, classifique o lançamento EXCLUSIVAMENTE como ADEQUADO, PARCIALMENTE ADEQUADO ou INADEQUADO. Justifique sua resposta com base nos critérios do RSC-PCCTAE apontados acima. Caso seja inadequado ou parcial, aponte objetivamente quais as falhas de comprovação e o que o servidor precisaria ajustar no dossiê.

Aviso: Lembre o servidor de que a mesma documentação não poderá ser utilizada em duplicidade em outros itens do memorial.`;
}

