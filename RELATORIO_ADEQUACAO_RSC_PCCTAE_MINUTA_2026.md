# Relatório de Adequação do Sistema à Minuta de Regulamentação do RSC-PCCTAE

Data da análise: 16 de abril de 2026

## 1. Objetivo

Este relatório consolida as alterações necessárias para deixar o sistema `RSC-TAE` o mais próximo possível da instrução constante no documento recebido em `C:\Users\T-GAMER\Downloads\_0_Analise MEC_Regulamentação RSC-50-60.pdf`.

O foco deste material é:

- comparar a minuta de decreto regulamentador com o comportamento atual do sistema;
- identificar divergências normativas, procedimentais e documentais;
- propor mudanças concretas no código, nos fluxos e nos artefatos gerados;
- organizar uma ordem de implementação para reduzir risco jurídico e retrabalho.

## 2. Base documental considerada

### 2.1. Documento recebido

O PDF analisado contém:

- Exposição de Motivos Interministerial `EMI nº 8/2026/SEI/ASTEC/GM/GM`;
- minuta de decreto regulamentador do RSC-PCCTAE;
- anexos I a VI com critérios específicos, unidades de medida e pontuações.

Conclusão jurídica-operacional:

- o documento recebido é uma **minuta de decreto**, não o decreto final publicado;
- ele é altamente relevante como direção normativa e técnica;
- porém, até a publicação oficial, ele não substitui o regulamento definitivo.

### 2.2. Normas oficiais verificadas

Foram confirmadas em fonte oficial:

- Lei nº 15.367, de 30 de março de 2026:
  `https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/L15367.htm`
- Lei nº 11.091 compilada, já com os dispositivos do RSC-PCCTAE:
  `https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11091compilado.htm`

Na verificação realizada em 16 de abril de 2026:

- foi localizada a lei vigente;
- não foi localizado, em fonte oficial consultada, o decreto regulamentador já numerado e publicado.

## 3. Conclusão executiva

O sistema está em um estágio funcional relevante e já reproduz boa parte da estrutura do RSC-PCCTAE, principalmente:

- níveis do RSC;
- catálogo de critérios;
- consolidação de pontos;
- montagem de requerimento, memorial e pacote documental;
- controle de concessão anterior e interstício;
- suporte a anexação documental e comprovação.

Entretanto, o sistema **ainda não está suficientemente aderente** à minuta para ser tratado como plenamente conforme. Os principais problemas estão concentrados em:

- divergências objetivas na matriz de pontuação;
- ausência de bloqueios reais para não duplicidade de fatos;
- baixa cobertura das exigências procedimentais da CRSC-PCCTAE;
- inconsistências entre código, modelos documentais e materiais auxiliares do repositório.

## 4. Diagnóstico geral por eixo

### 4.1. Aderência alta

- Estrutura de seis níveis do RSC-PCCTAE.
- Existência de regras mínimas por nível.
- Existência de catálogo com incisos I a VI.
- Registro de concessão anterior, saldo e data da última concessão.
- Verificação de interstício de 3 anos.
- Geração de requerimento, memorial e pacote em PDF.
- Registro de documentos, links institucionais e transcrições.

### 4.2. Aderência parcial

- Tabela de pontos e unidades de medida.
- Regras de elegibilidade por escolaridade.
- Requisitos mínimos por nível.
- Uso de declarações de não duplicidade e extraordinariedade.
- Base legal exibida na interface.
- Modelos textuais de requerimento e memorial.

### 4.3. Aderência baixa ou ausente

- Impedimento automático de uso duplicado do mesmo fato.
- Controles explícitos para servidor ativo e vedação em estágio probatório.
- Fluxo da CRSC-PCCTAE com prazos, decisão, recurso e documentação complementar.
- Registro de decisão fundamentada.
- Regras de efeitos financeiros e retroação excepcional.
- Controle institucional do limite de concessões previsto em lei.

## 5. Achados detalhados

## 5.1. Status normativo no sistema

### Situação atual

A tela de legislação mostra apenas a lei federal:

- [src/pages/Legislation.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/pages/Legislation.tsx:7)

### Problema

O sistema não distingue:

- lei já vigente;
- minuta de decreto em análise;
- eventual decreto futuro publicado;
- atos complementares do MEC previstos na própria minuta.

### Alteração necessária

- ampliar a página de legislação para separar:
  - norma vigente;
  - minuta em acompanhamento;
  - status regulatório;
  - observação expressa de que a minuta ainda não equivale a decreto publicado.

### Prioridade

Média.

---

## 5.2. Divergência em regra mínima do RSC-II

### Situação atual

Em [src/data/mock.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/mock.ts:17), o sistema define:

- `RSC-II` com mínimo de `20` pontos.

### Regra da minuta

O art. 4º da minuta prevê:

- RSC-I: 10 pontos;
- RSC-II: 15 pontos;
- RSC-III: 25 pontos;
- RSC-IV: 30 pontos;
- RSC-V: 52 pontos;
- RSC-VI: 75 pontos.

### Impacto

O sistema hoje pode:

- barrar indevidamente usuários elegíveis ao RSC-II;
- distorcer painéis, checklist e geração de documentos;
- produzir conclusão incorreta do nível pleiteável.

### Alteração necessária

- corrigir `pontosMinimos` do `RSC-II` de `20` para `15` em [src/data/mock.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/mock.ts:17).

### Prioridade

Crítica.

---

## 5.3. Divergências na matriz de critérios e pontuações

### Situação atual

O catálogo do sistema está em:

- [src/data/rolItens.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/rolItens.ts:1)

Ele já está muito próximo da estrutura dos Anexos I a VI da minuta, mas não totalmente aderente.

### Divergências materiais identificadas

#### Item 1 do Anexo I

Sistema:

- [src/data/rolItens.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/rolItens.ts:9)
- unidade: `Por mandato`
- pontos: `15`

Minuta:

- exercício do mandato como membro de conselhos superiores e colegiados;
- unidade: `Por ano ou fração acima de 6 meses`;
- pontos: `3`

#### Item 7 do Anexo I

Sistema:

- [src/data/rolItens.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/rolItens.ts:72)
- unidade: `Por mandato`
- pontos: `7,5`

Minuta:

- exercício de mandato em entidade sindical representativa;
- unidade: `Por ano ou fração acima de 6 meses`;
- pontos: `1,5`

#### Item 4 do Anexo I

Sistema:

- [src/data/rolItens.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/rolItens.ts:39)
- contempla membro de equipe designada em processos de apuração.

Minuta:

- inclui também `defensor dativo`.

#### Itens com necessidade de revisão textual fina

Mesmo quando a pontuação está correta, vários itens precisam revisão de redação para aderir à formulação da minuta, principalmente para evitar ampliação indevida de escopo.

Exemplos:

- [src/data/rolItens.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/rolItens.ts:92)
- [src/data/rolItens.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/rolItens.ts:267)
- [src/data/rolItens.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/rolItens.ts:382)
- [src/data/rolItens.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/rolItens.ts:397)
- [src/data/rolItens.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/rolItens.ts:587)

### Impacto

Esse é o núcleo jurídico do sistema. Divergência aqui afeta:

- cálculo de pontuação;
- orientação dada ao usuário;
- memorial;
- parecer técnico assistido por IA;
- segurança do dossiê final.

### Alteração necessária

- revisar item a item o catálogo `rolItens.ts` contra os Anexos I a VI da minuta;
- corrigir unidade, descrição, pontuação e modo de cálculo;
- ajustar textos para refletir exatamente o alcance normativo pretendido;
- revisar também labels e explicações derivadas no catálogo e no wizard.

### Prioridade

Crítica.

---

## 5.4. Regras de elegibilidade por escolaridade

### Situação atual

O mapeamento por escolaridade está em:

- [src/lib/rsc.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/lib/rsc.ts:15)

### Observação

A lógica atual está conceitualmente alinhada à lei:

- fundamental incompleto -> RSC-I;
- fundamental -> RSC-II;
- médio -> RSC-III;
- graduação -> RSC-IV;
- especialização -> RSC-V;
- mestrado -> RSC-VI;
- doutorado -> sem elegibilidade adicional.

### Risco

A implementação depende de busca textual por fragmentos como:

- `fundamental`
- `medio`
- `graduacao`
- `especializacao`
- `mestrado`
- `doutorado`

Isso é frágil para variações como:

- `ensino médio técnico`;
- `pós-graduação lato sensu`;
- nomenclaturas institucionais específicas;
- entradas livres inconsistentes.

### Alteração necessária

- substituir o campo livre de escolaridade por seleção estruturada;
- normalizar opções oficiais no perfil;
- impedir combinações ambíguas;
- manter compatibilidade com dados antigos por migração simples.

### Prioridade

Alta.

---

## 5.5. Não duplicidade de fatos: maior lacuna do sistema

### Situação atual

O sistema coleta declarações de não duplicidade:

- [src/pages/Consolidation.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/pages/Consolidation.tsx:46)
- [src/components/ItemDetailPanel.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/components/ItemDetailPanel.tsx:430)

Mas o método de inclusão de lançamentos:

- [src/context/AppContext.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/context/AppContext.tsx:482)

não faz bloqueio material para evitar:

- reutilização do mesmo fato em itens distintos;
- reutilização da mesma portaria para critérios incompatíveis;
- duplicidade de um mesmo evento em mais de um inciso.

### Regra da minuta

Cada atividade realizada pelo servidor que corresponda a requisito dos incisos I a VI:

- só poderá ser utilizada uma única vez;
- prevalecendo o enquadramento definido pela comissão.

### Impacto

Esse ponto é juridicamente crítico. Hoje o sistema:

- alerta, mas não impede;
- registra a declaração, mas não a valida;
- depende de honestidade do usuário ou auditoria manual posterior.

### Alteração necessária

- criar uma camada de validação de duplicidade antes de `addLancamento`;
- introduzir um conceito de `fato gerador` ou `evidência-base`;
- permitir que múltiplos documentos componham um único fato;
- impedir vinculação do mesmo fato a mais de um item;
- apresentar conflito claro para o usuário com opção de substituição/reclassificação;
- refletir esse controle na exportação do memorial e no parecer de IA.

### Modelo recomendado

Adicionar um identificador lógico por fato, por exemplo:

- número de portaria;
- processo SEI;
- edital;
- evento;
- período consolidado;
- hash semântico confirmado pelo usuário.

### Prioridade

Crítica.

---

## 5.6. Atividades ordinárias do cargo

### Situação atual

Existe exigência de confirmação na consolidação:

- [src/pages/Consolidation.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/pages/Consolidation.tsx:47)

E cada lançamento guarda:

- `declaracao_nao_ordinaria` em [src/data/mock.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/mock.ts:119)

### Regra da minuta

Não serão pontuados fatos que representem exclusivamente atribuições legais ordinárias do cargo, sem demonstração de:

- desenvolvimento de saberes;
- competências;
- inovação;
- responsabilidade ampliada;
- resultados institucionais relevantes.

### Lacuna

Hoje a verificação é declaratória. Não há:

- heurística de risco por item;
- exigência reforçada de justificativa;
- distinção entre atividade ordinária e atuação diferenciada.

### Alteração necessária

- criar campo obrigatório de justificativa qualitativa quando o item estiver em zona cinzenta;
- marcar itens com maior risco regulatório;
- exigir evidência adicional para itens propensos a confusão com atribuição ordinária;
- refletir isso no checklist, memorial e avaliação por IA.

### Prioridade

Alta.

---

## 5.7. Vedação para servidor em estágio probatório e exigência de servidor ativo

### Regra da minuta e da lei

- o RSC-PCCTAE se destina a servidores ativos;
- não será concedido a servidores em estágio probatório;
- experiências podem ser consideradas, inclusive nesse período, desde que a concessão ocorra fora do probatório.

### Situação atual

Não encontrei controle explícito de:

- situação funcional ativa;
- estágio probatório;
- data suficiente para superação do probatório.

### Alteração necessária

- incluir no perfil:
  - situação funcional;
  - data de ingresso;
  - indicador de estágio probatório;
- calcular se o servidor está ou não apto a requerer;
- bloquear geração do pacote quando o servidor ainda estiver em estágio probatório;
- permitir uso de experiências do período, mas não a concessão.

### Prioridade

Alta.

---

## 5.8. Fluxo institucional da CRSC-PCCTAE

### Regra da minuta

A minuta disciplina:

- instituição da CRSC-PCCTAE;
- composição paritária;
- mandato;
- impedimento e suspeição;
- regimento próprio;
- competência para análise de mérito;
- decisão fundamentada;
- resolução de concessão;
- prazo de análise de até 120 dias;
- recurso em 30 dias.

### Situação atual

O sistema fala da comissão em textos e contexto de IA:

- [src/lib/llmPrompt.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/lib/llmPrompt.ts:33)
- [src/pages/Consolidation.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/pages/Consolidation.tsx:869)

Mas não há módulo funcional para:

- triagem pela comissão;
- decisão;
- parecer;
- pedido de complementação;
- controle de prazo;
- recurso.

### Alteração necessária

Se o objetivo for aderência máxima à instrução, o sistema deveria passar de um gerador de dossiê para um sistema de processo administrativo simplificado, com:

- status processuais mais ricos;
- campos de análise da comissão;
- emissão de decisão;
- histórico de tramitação;
- pedido de diligência;
- reapreciação recursal.

### Observação

Isso é um salto de escopo importante. Pode ser implementado por fases.

### Prioridade

Alta, mas em segunda onda de execução.

---

## 5.9. Efeitos financeiros e prazo de 120 dias

### Regra da minuta e da lei

Os efeitos financeiros:

- partem da data do deferimento;
- não retroagem à data do requerimento;
- retroagem apenas se a análise passar do prazo legal;
- o prazo é recontado a partir da instrução completa quando houver diligência documental.

### Situação atual

O sistema registra:

- data da última concessão;
- saldo anterior;
- submissão do pacote.

Mas não modela:

- data do deferimento;
- data de instrução completa;
- prazo legal da comissão;
- retroação excepcional.

### Alteração necessária

- expandir `ProcessoRSC` com metadados processuais;
- armazenar protocolo, diligência, decisão e deferimento;
- calcular automaticamente data-base financeira;
- exibir isso no painel da comissão e no histórico do processo.

### Prioridade

Média-alta.

---

## 5.10. Recurso administrativo

### Regra da minuta

Da decisão da comissão cabe recurso em 30 dias.

### Situação atual

Não há modelagem de recurso.

### Alteração necessária

- adicionar evento de decisão;
- adicionar janela recursal;
- registrar petição recursal e decisão final;
- refletir isso na cronologia do processo.

### Prioridade

Média-alta.

---

## 5.11. Controle do limite institucional de concessões

### Regra legal

A Lei nº 15.367/2026 prevê limite de até 75% do total de servidores do PCCTAE, observada disponibilidade orçamentária.

### Situação atual

Não existe camada institucional para:

- acompanhar quantitativo global;
- impedir concessões fora do limite;
- sinalizar risco orçamentário.

### Alteração necessária

Caso o sistema venha a operar em nível institucional, incluir:

- painel de governança;
- total de servidores elegíveis;
- total concedido;
- projeção de impacto.

### Prioridade

Média.

---

## 5.12. Documentos válidos e instrução mínima do requerimento

### Regra da minuta

O requerimento deve conter, no mínimo:

- formulário padrão;
- memorial;
- documentação comprobatória;
- declaração de conformidade;
- dados de nível pleiteado e saldo anterior, se houver.

### Situação atual

O sistema cobre muito bem a base documental:

- armazenamento e deduplicação de arquivos por hash:
  [src/context/AppContext.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/context/AppContext.tsx:414)
- suporte a links institucionais:
  [src/context/AppContext.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/context/AppContext.tsx:475)
- metadados documentais:
  [src/data/mock.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/mock.ts:96)

### Lacuna

Falta separar melhor:

- documento comprobatório principal;
- autodeclaração;
- documento complementar;
- documento pendente de diligência;
- evidência apenas referencial.

### Alteração necessária

- tipificar o papel do documento no processo;
- permitir múltiplos documentos por fato;
- permitir marcação explícita de “complementação solicitada pela comissão”.

### Prioridade

Alta.

---

## 5.13. Inconsistências nos modelos documentais do repositório

### Requerimento em Markdown

O arquivo [requerimento.md](c:/Users/T-GAMER/Documents/RSC-TAE/requerimento.md:13) está desatualizado e incompatível com a minuta e com o código.

Exemplos:

- exige quantidades mínimas de itens muito superiores às da minuta;
- mantém texto que não bate com a regra atual do sistema;
- tende a induzir erro regulatório.

### Memorial de exemplo

O arquivo [memoria_descritivo.md](c:/Users/T-GAMER/Documents/RSC-TAE/memoria_descritivo.md:16) representa um modelo útil, mas precisa revisão para refletir a estrutura final da regulamentação.

### Exportação em PDF

Há referências indevidas ao art. 4º como base dos incisos:

- [src/pages/Consolidation.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/pages/Consolidation.tsx:770)
- [src/lib/pdfGenerator.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/lib/pdfGenerator.ts:740)

Na minuta analisada:

- os incisos I a VI estão no art. 3º;
- o art. 4º trata dos níveis, pontuação e quantitativos mínimos.

### Alteração necessária

- revisar todos os templates textuais;
- alinhar referências de artigo;
- atualizar linguagem do requerimento;
- sincronizar modelos `.md` e PDFs gerados com a mesma base normativa.

### Prioridade

Crítica.

---

## 5.14. Consistência entre front-end, textos e dados

### Situação atual

Existem sinais de desalinhamento entre:

- dados normativos em `src/data/rolItens.ts`;
- níveis em `src/data/mock.ts`;
- textos do consolidado;
- arquivos `.md` auxiliares;
- base antiga em `initial_data`.

### Risco

Quando o sistema usa mais de uma “verdade normativa”, surgem:

- divergências no cálculo;
- divergências na exibição;
- divergências no PDF;
- dificuldade de manutenção.

### Alteração necessária

- centralizar a base normativa em uma única fonte estruturada;
- derivar dela:
  - catálogo;
  - níveis;
  - labels;
  - descrições;
  - textos de apoio;
  - trechos de exportação.

### Prioridade

Alta.

## 6. Inventário de alterações recomendadas por arquivo

## 6.1. Alterações obrigatórias de curto prazo

### [src/data/mock.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/mock.ts:9)

- corrigir `RSC-II` para 15 pontos;
- revisar nomenclaturas de equivalência;
- considerar expansão do tipo `ProcessoRSC` para suportar estados processuais.

### [src/data/rolItens.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/data/rolItens.ts:1)

- auditar todos os 56 itens contra os Anexos I a VI;
- corrigir divergências de pontuação e unidade;
- ajustar descrições para evitar interpretação ampliativa;
- incluir hipóteses textuais faltantes, como `defensor dativo`.

### [src/lib/rsc.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/lib/rsc.ts:15)

- tornar elegibilidade por escolaridade menos dependente de texto livre;
- adicionar futuras validações de aptidão funcional.

### [src/context/AppContext.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/context/AppContext.tsx:482)

- bloquear duplicidade de fatos;
- suportar agrupamento por evidência-base;
- suportar novos metadados processuais.

### [src/pages/Consolidation.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/pages/Consolidation.tsx:46)

- transformar declarações em regras mais robustas;
- corrigir referências legais;
- preparar campos processuais adicionais;
- reforçar bloqueios para geração do pacote.

### [src/lib/pdfGenerator.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/lib/pdfGenerator.ts:629)

- corrigir referências ao artigo dos incisos;
- atualizar formulações textuais do requerimento e memorial;
- refletir a regulamentação com mais precisão.

### [requerimento.md](c:/Users/T-GAMER/Documents/RSC-TAE/requerimento.md:1)

- revisar integralmente ou substituir;
- remover critérios mínimos antigos incompatíveis.

## 6.2. Alterações importantes de segunda fase

### [src/pages/Legislation.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/pages/Legislation.tsx:1)

- incluir status regulatório;
- incluir minuta/decreto em acompanhamento;
- destacar norma vigente versus norma em proposta.

### [src/pages/ProfileSetup.tsx](c:/Users/T-GAMER/Documents/RSC-TAE/src/pages/ProfileSetup.tsx:1)

- incluir situação funcional;
- incluir controle de estágio probatório;
- estruturar escolaridade com opções oficiais.

### [src/lib/llmPrompt.ts](c:/Users/T-GAMER/Documents/RSC-TAE/src/lib/llmPrompt.ts:33)

- reforçar instruções de não duplicidade;
- exigir leitura mais fiel da base normativa;
- incorporar risco de atividade ordinária.

### [memoria_descritivo.md](c:/Users/T-GAMER/Documents/RSC-TAE/memoria_descritivo.md:1)

- alinhar o modelo-base ao texto regulatório final adotado.

## 7. Proposta de priorização

## Fase 1 - Correção normativa crítica

- corrigir regra do RSC-II;
- revisar integralmente `rolItens.ts`;
- corrigir modelos e referências legais dos PDFs;
- revisar `requerimento.md`.

Resultado esperado:

- sistema deixa de produzir erros objetivos de cálculo e de referência normativa.

## Fase 2 - Segurança jurídica do lançamento

- implementar bloqueio real de duplicidade;
- reforçar controle de extraordinariedade;
- tipificar melhor documentos e fatos.

Resultado esperado:

- sistema passa a prevenir os principais vícios materiais do dossiê.

## Fase 3 - Elegibilidade funcional

- estruturar escolaridade;
- incluir situação funcional;
- bloquear estágio probatório.

Resultado esperado:

- sistema passa a impedir requerimentos inelegíveis antes da geração do pacote.

## Fase 4 - Processo da comissão

- modelar CRSC-PCCTAE;
- diligência documental;
- decisão fundamentada;
- prazo de 120 dias;
- recurso em 30 dias;
- data-base financeira.

Resultado esperado:

- sistema deixa de ser apenas preparador documental e passa a apoiar o ciclo administrativo do RSC.

## Fase 5 - Governança institucional

- limite de 75%;
- acompanhamento orçamentário;
- painéis institucionais.

Resultado esperado:

- aderência ampliada ao regime legal em nível institucional.

## 8. Recomendação de arquitetura normativa

Para reduzir retrabalho, recomenda-se criar uma base central estruturada, por exemplo:

- `src/data/normative/rsc-pcctae-2026.ts`

Essa base deveria conter:

- status normativo da fonte;
- data da fonte;
- níveis;
- pontuação mínima;
- quantidade mínima;
- grupos de incisos obrigatórios;
- catálogo completo dos itens;
- unidade;
- pontos;
- regra de cálculo;
- referência do anexo e item.

A partir dessa base, o sistema deve derivar:

- dashboard;
- catálogo;
- wizard;
- validações;
- memorial;
- requerimento;
- parecer assistido por IA.

## 9. Classificação final de aderência atual

### Aderência material à minuta

Média.

### Aderência procedimental à minuta

Baixa.

### Aderência documental/formal

Média-baixa.

### Risco de uso sem correções

Moderado a alto, especialmente se o sistema for usado como base final de protocolo sem revisão institucional.

## 10. Próximo passo recomendado

O próximo ciclo de trabalho ideal é:

1. corrigir imediatamente a matriz normativa;
2. revisar os templates e PDFs;
3. implementar controle real de não duplicidade;
4. adicionar elegibilidade funcional;
5. abrir uma segunda frente para modelar o fluxo da comissão.

## 11. Resumo objetivo para gestão

Se a meta for deixar o sistema o mais próximo possível da instrução analisada, as mudanças indispensáveis são:

- corrigir a tabela normativa;
- unificar a fonte normativa do projeto;
- impedir duplicidade real de fatos;
- bloquear casos inelegíveis;
- alinhar os documentos gerados ao texto regulatório;
- preparar o sistema para a atuação da CRSC-PCCTAE.

Sem essas mudanças, o sistema continua útil como ferramenta de organização e pré-montagem de dossiê, mas ainda não deve ser tratado como plenamente aderente ao modelo regulatório proposto na minuta de 2026.
