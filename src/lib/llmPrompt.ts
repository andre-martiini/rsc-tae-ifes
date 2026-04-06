import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ItemRSC, Lancamento, Documento, Servidor } from '../data/mock';

export function generateLLMPrompt(params: {
    item: ItemRSC;
    lancamento: Lancamento;
    documento?: Documento;
    servidor?: Servidor | null;
}): string {
    const { item, lancamento, documento, servidor } = params;

    const dataInicioStr = lancamento.data_inicio
        ? format(new Date(lancamento.data_inicio), 'dd/MM/yyyy', { locale: ptBR })
        : 'Não informada';
    const dataFimStr = lancamento.data_fim
        ? format(new Date(lancamento.data_fim), 'dd/MM/yyyy', { locale: ptBR })
        : 'Não informada';

    const periodoStr =
        lancamento.data_inicio && lancamento.data_fim
            ? `${dataInicioStr} até ${dataFimStr}`
            : 'Não exigido para este item';

    const docInfo = documento
        ? `- Documento de referência: ${documento.nome_arquivo}`
        : '- Documento de referência: (Verifique o arquivo anexo)';

    const transcricaoInfo = documento?.transcricao
        ? `\n--- CONTEÚDO TRANSCRITO DO DOCUMENTO ---\n${documento.transcricao}\n--- FIM DA TRANSCRIÇÃO ---\n`
        : `\n(Nota: A transcrição detalhada do documento não está disponível neste prompt. Por favor, analise o arquivo PDF anexo para realizar a avaliação de mérito.)\n`;

    return `Contexto e Papel da IA: Você atua como um membro especialista da Comissão para Reconhecimento de Saberes e Competências (CRSC-PCCTAE) de uma Instituição Federal de Ensino. Estou submetendo um processo de RSC-PCCTAE e preciso que você faça a análise de mérito para validar se o documento em anexo comprova adequadamente o seguinte item da regulamentação.

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
B) Atribuição Ordinária: Não poderão ser consideradas atividades que fazem parte das atribuições rotineiras e ordinárias do cargo ocupado pelo servidor.
C) Conformidade da Unidade: A comprovação deve preencher estritamente a exigência da unidade de medida (ex: se for "Por designação", exige-se portaria/ato formal; se for "Por ano", exige-se comprovação de tempo).

Tarefa para a IA:
Analise rigorosamente o documento fornecido em contraste com os dados declarados e responda aos seguintes pontos de verificação:
1. Validade e Legibilidade: O documento é oficial, válido e legível? A autoria e o servidor (${servidor?.nome_completo || 'Não identificado'}) estão devidamente identificados?
2. Temporalidade: As datas contidas no documento estão compreendidas ou cobrem o período informado (${periodoStr})?
3. Aderência ao Critério: A atividade descrita no documento comprova de forma inquestionável e exata a Descrição do Item (${item.descricao})?
4. Filtro de Atribuição Ordinária: A atividade demonstra uma competência/saber adicional ou há indícios de que seja apenas a execução da rotina básica obrigatória do cargo?
5. Métrica e Quantidade: A quantidade declarada de "${lancamento.quantidade_informada}" atende a métrica exigida pela unidade de medida ("${item.unidade_medida}") e pode ser comprovada no documento?

Parecer Final da Comissão:
Ao final da análise, emita um parecer classificando o lançamento EXCLUSIVAMENTE como ADEQUADO, PARCIALMENTE ADEQUADO ou INADEQUADO. Justifique sua resposta com base nos critérios do RSC-PCCTAE apontados acima. Caso seja inadequado ou parcial, aponte objetivamente quais as falhas de comprovação e o que o servidor precisaria fazer para corrigir.

Aviso: Lembre o servidor de que este mesmo fato documentado não poderá ser utilizado em duplicidade em outros itens do memorial.`;
}
