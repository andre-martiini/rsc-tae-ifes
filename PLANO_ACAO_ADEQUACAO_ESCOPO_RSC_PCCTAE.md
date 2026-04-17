# Plano de Ação para Adequação do Sistema RSC-PCCTAE

**Escopo considerado:** preparação do dossiê do servidor, com recepção/organização da documentação, apoio aos cálculos e emissão de três conjuntos documentais:
- documentos originais;
- memorial;
- requerimento.

**Fora deste plano:** fluxo da comissão, análise processual, decisão, recurso, prazo legal, efeitos financeiros e governança institucional.

---

## 1. Objetivo Geral

Adequar o sistema para que ele continue operando como **ferramenta de montagem documental e apoio técnico ao servidor**, mas com maior aderência normativa, maior consistência dos cálculos, melhor qualidade dos textos gerados e menor risco de erro material no dossiê final.

---

## 2. Resultado Esperado

Ao final deste plano, o sistema deverá:

- aplicar corretamente as regras normativas usadas como base;
- calcular corretamente pontuação, itens mínimos e elegibilidade documental;
- impedir erros materiais evidentes, como duplicidade de fatos;
- exigir informações mínimas relevantes para a montagem do dossiê;
- produzir requerimento e memorial coerentes com a base normativa adotada;
- organizar os documentos comprobatórios de forma mais clara e defensável.

---

## 3. Estratégia de Execução

A execução será feita em partes, em blocos independentes, para reduzir risco de retrabalho:

1. consolidar a base normativa do sistema;
2. corrigir regras de cálculo e elegibilidade;
3. fortalecer validações do dossiê;
4. revisar os modelos documentais e PDFs;
5. melhorar a classificação e organização dos documentos;
6. alinhar interface e textos auxiliares.

---

## 4. Plano por Fases

## Fase 1. Consolidação da Base Normativa

### Objetivo

Eliminar divergências entre catálogo, níveis, textos exibidos e documentos gerados.

### Problemas que esta fase resolve

- divergência entre `mock.ts`, `rolItens.ts`, telas e PDFs;
- múltiplas “verdades normativas” no projeto;
- dificuldade de manutenção futura.

### Ações

- criar uma base normativa central estruturada, por exemplo:
  - `src/data/normative/rsc-pcctae-2026.ts`
- mover para essa base:
  - níveis do RSC;
  - pontuação mínima por nível;
  - quantidade mínima de itens por nível;
  - incisos obrigatórios, se aplicável;
  - catálogo completo dos itens;
  - unidade de medida;
  - pontuação por unidade;
  - modo de cálculo;
  - referência normativa do item.
- fazer com que as demais partes do sistema consumam essa base única:
  - `src/data/mock.ts`
  - `src/data/rolItens.ts`
  - `src/lib/rsc.ts`
  - `src/pages/Consolidation.tsx`
  - `src/lib/pdfGenerator.ts`

### Entregáveis

- fonte normativa única;
- remoção de duplicidades de configuração;
- estrutura pronta para futuras revisões normativas.

### Critério de aceite

- nenhuma regra normativa relevante fica duplicada em mais de um arquivo de negócio;
- catálogo, telas e documentos passam a usar a mesma origem de dados.

---

## Fase 2. Correção da Matriz Normativa

### Objetivo

Corrigir as regras e itens usados nos cálculos e na orientação ao servidor.

### Problemas que esta fase resolve

- erro objetivo no `RSC-II`;
- itens com pontuação, unidade ou descrição divergentes;
- risco de cálculo incorreto e memorial juridicamente frágil.

### Ações

- corrigir `RSC-II` de `20` para `15` pontos.
- revisar integralmente os itens do catálogo contra a minuta adotada como base.
- corrigir, item a item:
  - descrição;
  - unidade de medida;
  - pontuação por unidade;
  - cálculo automático ou manual;
  - limites de pontuação, quando houver.
- revisar redações para evitar interpretação ampliativa.
- incluir hipóteses textuais faltantes identificadas no relatório, como o caso de `defensor dativo`, se confirmado na base normativa adotada.

### Entregáveis

- catálogo normativo revisado;
- pontuação coerente com a base escolhida;
- textos dos itens juridicamente mais precisos.

### Critério de aceite

- cada item do catálogo possui correspondência validada com a base normativa adotada;
- os cálculos do sistema refletem corretamente essa tabela.

---

## Fase 3. Elegibilidade e Dados Essenciais do Servidor

### Objetivo

Melhorar a qualidade dos dados do perfil que impactam diretamente a montagem do pedido.

### Problemas que esta fase resolve

- fragilidade da elegibilidade baseada em interpretação textual;
- risco de geração de documentação com premissas erradas;
- perfil incompleto para preenchimento coerente do requerimento e memorial.

### Ações

- substituir completamente a dependência de texto livre para elegibilidade.
- padronizar escolaridade em valores oficiais controlados.
- ajustar `src/lib/rsc.ts` para usar valores estruturados, não heurística textual.
- incluir no perfil apenas os campos funcionais mínimos relevantes ao dossiê:
  - situação funcional ativa;
  - data de ingresso;
  - indicador de estágio probatório, se necessário para bloqueio documental.
- definir regra clara:
  - o sistema pode registrar experiências anteriores;
  - o sistema não deve liberar emissão final se houver inelegibilidade funcional que afete o pedido.

### Entregáveis

- perfil mais estruturado;
- lógica de elegibilidade mais estável;
- bloqueios básicos de uso indevido.

### Critério de aceite

- o sistema identifica corretamente o nível pleiteável sem depender de variações textuais;
- o sistema bloqueia montagem final em hipóteses inelegíveis previstas na regra adotada.

---

## Fase 4. Controle de Duplicidade de Fatos

### Objetivo

Impedir reutilização indevida do mesmo fato em múltiplos itens.

### Problemas que esta fase resolve

- o sistema hoje coleta declaração, mas não impede duplicidade material;
- risco de superpontuação e memorial inconsistente.

### Ações

- introduzir o conceito de `fato gerador` ou `evidência-base`.
- permitir vincular um ou mais documentos ao mesmo fato.
- bloquear uso do mesmo fato em mais de um item incompatível.
- antes de `addLancamento`, validar:
  - número de portaria;
  - processo SEI;
  - edital;
  - evento;
  - período consolidado;
  - outro identificador lógico definido.
- exibir mensagem clara ao usuário quando houver conflito.
- permitir correção por:
  - substituição do fato;
  - reclassificação do item;
  - cancelamento do lançamento.

### Entregáveis

- camada real de validação de duplicidade;
- interface de conflito compreensível;
- memória lógica mais consistente entre documentos e itens.

### Critério de aceite

- o mesmo fato não pode ser usado silenciosamente em dois lançamentos incompatíveis;
- conflitos são detectados antes da consolidação final.

---

## Fase 5. Controle de Atividade Ordinária e Justificativa Qualitativa

### Objetivo

Reduzir risco de enquadramento indevido de atividades meramente ordinárias.

### Problemas que esta fase resolve

- hoje a verificação é apenas declaratória;
- itens “cinzentos” podem gerar memorial frágil.

### Ações

- identificar itens com maior risco de confusão com atribuição ordinária.
- para esses itens, exigir justificativa qualitativa obrigatória.
- criar campo de justificativa explicando:
  - diferencial da atividade;
  - ampliação de responsabilidade;
  - resultado institucional;
  - elemento de inovação, especialização ou destaque.
- refletir essa justificativa:
  - no resumo do item;
  - no memorial;
  - nas orientações ao usuário.

### Entregáveis

- campo de justificativa reforçada;
- classificação de itens com risco regulatório;
- memorial mais robusto.

### Critério de aceite

- itens sensíveis não podem ser consolidados sem justificativa adequada;
- a justificativa aparece de forma consistente no material gerado.

---

## Fase 6. Tipificação e Organização dos Documentos

### Objetivo

Melhorar a estrutura do conjunto documental original.

### Problemas que esta fase resolve

- todos os documentos são tratados de modo muito parecido;
- pouca clareza sobre papel documental de cada anexo.

### Ações

- classificar documentos por papel:
  - comprobatório principal;
  - complementar;
  - autodeclaração;
  - referência institucional;
  - evidência vinculada;
  - documento de apoio.
- permitir múltiplos documentos para um mesmo fato.
- separar melhor os documentos na exportação e no índice.
- manter deduplicação por hash, mas somar semântica documental.
- refletir isso nos nomes e agrupamentos dos arquivos exportados.

### Entregáveis

- estrutura documental mais clara;
- melhor rastreabilidade entre fato, item e arquivo;
- pacote final mais organizado.

### Critério de aceite

- cada documento tem função definida;
- o conjunto de documentos originais fica inteligível e coerente com os itens lançados.

---

## Fase 7. Revisão do Requerimento, Memorial e PDFs

### Objetivo

Alinhar todos os documentos gerados com a base normativa e com o escopo real do sistema.

### Problemas que esta fase resolve

- referências legais erradas;
- templates desatualizados;
- inconsistência entre Markdown e PDF.

### Ações

- revisar `requerimento.md`.
- revisar `memoria_descritivo.md`.
- corrigir referências normativas em:
  - `src/pages/Consolidation.tsx`
  - `src/lib/pdfGenerator.ts`
- alinhar linguagem do requerimento ao papel real do sistema:
  - apoio à montagem;
  - organização dos documentos;
  - consolidação das informações prestadas pelo servidor.
- alinhar memorial ao catálogo revisado.
- garantir consistência entre:
  - tela;
  - Markdown;
  - PDF gerado;
  - ZIP final.

### Entregáveis

- requerimento revisado;
- memorial revisado;
- PDFs consistentes com a base normativa usada.

### Critério de aceite

- não há artigo, inciso, exigência mínima ou texto divergente entre os materiais gerados;
- o conteúdo documental é compatível com o escopo do sistema.

---

## Fase 8. Ajustes de Interface e Textos Auxiliares

### Objetivo

Melhorar a transparência normativa e a clareza de uso, sem expandir o sistema para além do seu papel.

### Problemas que esta fase resolve

- baixa clareza sobre qual norma está sendo adotada;
- risco de o usuário interpretar a minuta como regulamento final;
- textos auxiliares inconsistentes.

### Ações

- melhorar a página de legislação para informar:
  - norma vigente;
  - minuta em acompanhamento, se aplicável;
  - status regulatório;
  - observação de que a base usada pode ser provisória, quando for o caso.
- revisar textos do wizard, painéis e mensagens de validação.
- alinhar mensagens de erro e pendência com o novo modelo de regras.
- revisar rótulos dos incisos, critérios e descrições resumidas.

### Entregáveis

- página de legislação mais clara;
- mensagens mais precisas;
- menor ambiguidade para o usuário.

### Critério de aceite

- o usuário entende qual base normativa está sendo usada;
- a interface não sugere que o sistema faz análise processual institucional.

---

## 5. Ordem Recomendada de Implementação

## Parte 1. Base normativa e correção de cálculo

- Fase 1
- Fase 2

## Parte 2. Validações materiais do dossiê

- Fase 3
- Fase 4
- Fase 5

## Parte 3. Organização documental e emissão final

- Fase 6
- Fase 7

## Parte 4. Ajustes de transparência e acabamento

- Fase 8

---

## 6. Dependências Entre Fases

- Fase 1 é pré-requisito ideal para Fases 2, 7 e 8.
- Fase 2 deve vir antes de revisar memorial e requerimento.
- Fase 3 deve vir antes dos bloqueios finais da consolidação.
- Fase 4 e Fase 6 têm relação direta e devem ser pensadas juntas.
- Fase 7 depende da estabilização das regras de cálculo e do catálogo.
- Fase 8 pode ocorrer em paralelo no fim, desde que a base normativa já esteja definida.

---

## 7. Prioridade Prática

### Prioridade crítica

- Fase 1. Consolidação da base normativa
- Fase 2. Correção da matriz normativa
- Fase 7. Revisão do requerimento, memorial e PDFs

### Prioridade alta

- Fase 3. Elegibilidade e dados essenciais do servidor
- Fase 4. Controle de duplicidade de fatos
- Fase 6. Tipificação e organização dos documentos

### Prioridade média-alta

- Fase 5. Controle de atividade ordinária
- Fase 8. Ajustes de interface e textos auxiliares

---

## 8. Critérios Gerais de Conclusão

O plano será considerado concluído quando:

- o sistema usar uma única base normativa estruturada;
- os cálculos estiverem corretos segundo a base adotada;
- não houver duplicidade material silenciosa de fatos;
- os dados mínimos do servidor estiverem estruturados;
- os documentos puderem ser classificados e organizados adequadamente;
- requerimento, memorial e conjunto de documentos originais forem gerados de modo coerente entre si;
- a interface deixar claro o papel do sistema e a base normativa utilizada.

---

## 9. Proposta de Execução Parte por Parte

### Parte 1

**Tema:** base normativa e catálogo  
**Fases:** 1 e 2  
**Resultado:** sistema passa a calcular e orientar corretamente.

### Parte 2

**Tema:** validações do dossiê  
**Fases:** 3, 4 e 5  
**Resultado:** sistema passa a evitar os principais erros materiais do usuário.

### Parte 3

**Tema:** documentos e exportação  
**Fases:** 6 e 7  
**Resultado:** os três conjuntos documentais saem alinhados, claros e defensáveis.

### Parte 4

**Tema:** acabamento normativo e UX  
**Fase:** 8  
**Resultado:** o sistema comunica melhor suas bases e limitações.

---

## 10. Próximo Passo Recomendado

O melhor próximo passo é começar pela **Parte 1**, com este recorte:

1. criar a base normativa central;
2. corrigir `RSC-II`;
3. revisar o catálogo `rolItens.ts`;
4. só depois revisar requerimento, memorial e PDFs.
