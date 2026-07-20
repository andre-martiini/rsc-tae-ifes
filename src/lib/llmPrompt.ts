import type { ItemRSC, Lancamento, Documento, Servidor } from '../data/mock';
import { formatarDataSegura } from './utils';
import { periodosDoLancamento } from './periodos';
import { CATALOG_VERSION, rolItensRSC } from '../data/normative/rsc-pcctae-2026';

export function generateLLMPrompt(params: {
    item: ItemRSC;
    lancamento: Lancamento;
    /** Todos os comprovantes do lançamento. Aceita também `documento` (singular) por compatibilidade. */
    documentos?: Documento[];
    documento?: Documento;
    servidor?: Servidor | null;
}): string {
    const { item, lancamento, servidor } = params;
    const documentos = (params.documentos ?? (params.documento ? [params.documento] : []))
        .filter((d): d is Documento => !!d);

    const periodosLanc = periodosDoLancamento(lancamento);
    const periodoStr =
        periodosLanc.length > 0
            ? periodosLanc
                  .map((p) => `${formatarDataSegura(p.inicio, 'Não informada')} até ${formatarDataSegura(p.fim, 'Não informada')}`)
                  .join('; ')
            : 'Não exigido para este item';

    let docInfo: string;
    let transcricaoInfo: string;

    if (documentos.length === 0) {
        docInfo = '- Documento de referência: (Nenhum documento anexado)';
        transcricaoInfo = '\n(Nota: Transcrição indisponível.)\n';
    } else {
        docInfo = [
            `- Documentos de referência (${documentos.length}):`,
            ...documentos.map((doc) => `  - ID: "${doc.id}" | Nome: ${doc.nome_arquivo}`),
        ].join('\n');
        transcricaoInfo = [
            '',
            '=== DOCUMENTOS E SUAS TRANSCRIÇÕES ===',
            ...documentos.map((doc, i) => {
                const cabecalho = `--- DOCUMENTO ${i + 1} DE ${documentos.length}: ID: "${doc.id}" | ${doc.nome_arquivo} ---`;
                const corpo = doc.transcricao
                    ? `${doc.transcricao}\n--- FIM DO DOCUMENTO ${i + 1} ---`
                    : '(Transcrição não disponível. Analise os dados declarados.)';
                return `${cabecalho}\n${corpo}`;
            }),
            '',
        ].join('\n');
    }

    const escopoItens = rolItensRSC
        .map((i) => `  - ${i.id} (Inciso ${i.inciso}-${i.numero}): ${i.descricao} [Métrica: ${i.unidade_medida}, Modo: ${i.modo_calculo}]`)
        .join('\n');

    return `Você é um auditor experiente de processos de RSC (Reconhecimento de Saberes e Competências) de servidores TAE.

Analise estritamente este lançamento específico do servidor em contraste com os documentos fornecidos e as regras oficiais do RSC-PCCTAE.

=== DADOS DO SERVIDOR ===
Nome: ${servidor?.nome_completo || 'Não identificado'}
Cargo: ${servidor?.cargo || 'Não identificado'}

=== LANÇAMENTO SOB ANÁLISE ===
- ID do Lançamento: "${lancamento.id || 'lancamento-atual'}"
- Item Atual Declarado: ${item.id} (Inciso ${item.inciso}-${item.numero})
- Descrição do Item: ${item.descricao}
- Unidade de Medida / Métrica: ${item.unidade_medida}
- Modo de Cálculo: ${item.modo_calculo}
- Quantidade Informada: ${lancamento.quantidade_informada} ${item.unidade_medida}
- Período Informado: ${periodoStr}
${docInfo}

${transcricaoInfo}

=== REGRAS DE AUDITORIA DO RSC-PCCTAE ===
A) Documentos Válidos: A comprovação deve ocorrer por meios oficiais (portarias, certificados, diplomas, publicações, diários oficiais, atas, relatórios técnicos, declarações de conclusão/instrutoria, etc.).
B) Não duplicidade: a mesma documentação ou o mesmo fato comprovado não deve ser utilizado em duplicidade entre requisitos específicos.
C) Atribuição Ordinária: não podem ser pontuados fatos que representem exclusivamente atribuições legais do cargo, sem demonstração de saberes, competências, inovação, responsabilidade ampliada ou resultados institucionais relevantes.
D) Conformidade da Unidade: a comprovação deve preencher estritamente a unidade de medida (ex.: "Por designação" exige ato formal; "Por ano ou fração" exige comprovação temporal suficiente).

=== ITENS DISPONÍVEIS NO CATÁLOGO (PARA RECLASSIFICAÇÃO) ===
${escopoItens}

=== TAREFA E FORMATO DE SAÍDA ===
Sua tarefa é avaliar se este lançamento está ADEQUADO. Se houver qualquer divergência ou inconformidade, você deve propor uma ou mais correções estruturadas.

Você deve responder EXCLUSIVAMENTE com um objeto JSON válido, seguindo o schema abaixo. Não adicione nenhum texto introdutório, explicativo ou cercas Markdown.

Schema JSON Esperado:
{
  "schema_version": 1,
  "catalog_version": "${CATALOG_VERSION}",
  "operacoes": [
    // Se o lançamento for 100% ADEQUADO, este array deve ser vazio: []
    // Se houver problemas, adicione um objeto para este lançamento:
    {
      "lancamento_id": "${lancamento.id || 'lancamento-atual'}",
      "tipo": "remover_lancamento" | "reclassificar" | "ajustar_periodos" | "ajustar_quantidade" | "sinalizar",
      "severidade": "alta" | "media" | "baixa",
      "justificativa": "Explicação objetiva da inconformidade e da correção proposta.",
      
      // OBRIGATÓRIO apenas se tipo for "reclassificar":
      "novo_item_rsc_id": "ID do novo item do catálogo (ex.: item-12)",
      
      // OBRIGATÓRIO apenas se tipo for "reclassificar" (e o novo item for temporal) ou "ajustar_periodos":
      "novos_periodos": [{ "inicio": "YYYY-MM-DD", "fim": "YYYY-MM-DD" }],
      
      // OBRIGATÓRIO apenas se tipo for "reclassificar" (e o novo item for manual) ou "ajustar_quantidade":
      "nova_quantidade": 123,
      
      // OBRIGATÓRIO apenas se tipo for "sinalizar":
      "descricao": "Explicação sobre o que o auditor ou usuário deve conferir manualmente.",
      
      // OPCIONAL: IDs exatos dos comprovantes que devem ser removidos por não comprovarem o fato:
      "documentos_remover": []
    }
  ]
}
`;
}
