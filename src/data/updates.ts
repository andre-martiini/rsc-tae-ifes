/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UpdateEntry {
  date: string;
  title: string;
  description: string;
  features?: string[];
  improvements?: string[];
  fixes?: string[];
}

export const SYSTEM_UPDATES: UpdateEntry[] = [
  {
    date: '04 de agosto de 2026',
    title: 'Orientação sobre qualidade do PDF na instrução do processo no SIPAC',
    description:
      'Relato em reunião: um processo cujo comprovante excedeu o limite do SIPAC foi comprimido com uma ferramenta externa e virou uma sequência de imagens — nem o avaliador nem a IA conseguiram mais ler o conteúdo.',
    improvements: [
      'O roteiro "Instrução do processo no SIPAC" ganhou dois avisos novos: não compactar o PDF gerado com ferramentas externas (o sistema já divide automaticamente o caderno de comprovantes em partes quando excede o limite do protocolo) e preferir digitalizações de boa resolução, com OCR quando possível.',
    ],
  },
  {
    date: '03 de agosto de 2026',
    title: 'Observações agora aparecem no Memorial, aviso de quantidade duplicada e comprovantes grandes divididos automaticamente',
    description:
      'Duas correções pedidas por usuários e uma novidade para quem tem muitos comprovantes digitalizados.',
    fixes: [
      'Corrigido: a observação digitada em cada item lançado era salva, mas não aparecia em lugar nenhum legível do Memorial gerado — só ficava guardada de forma invisível para o sistema avaliador. Agora o Memorial traz uma seção "Observações do Servidor sobre os Itens Lançados", listando o item e a observação de cada lançamento que tiver uma.',
      'Corrigido: ao lançar um novo item com quantidade igual ou maior que a de um lançamento já existente do mesmo item, mas sem comprovantes suficientes para justificar isso, era possível contar as mesmas unidades duas vezes sem perceber. O sistema agora avisa nesse momento — tanto ao cadastrar manualmente quanto ao confirmar uma sugestão da Triagem por IA — e oferece juntar ao lançamento existente em vez de criar um novo.',
    ],
    features: [
      'Quando o caderno de Documentos Comprobatórios ultrapassa 35 MB (limite de anexo do protocolo no SIPAC), o sistema agora divide automaticamente os comprovantes em várias partes numeradas (ex.: "parte-1-de-3"), sem cortar nenhum documento ao meio. Ao gerar o pacote, você verá um aviso pedindo para anexar todas as partes, na ordem, ao protocolar o processo.',
    ],
  },
  {
    date: '03 de agosto de 2026',
    title: 'Correção: documento some ao restaurar backup em outro computador',
    description: 'Um usuário relatou que, após lançar um documento e depois restaurar um backup (.zip) — por exemplo, ao continuar o preenchimento em outro computador ou navegador — o documento aparecia normalmente no Dashboard, mas ao clicar para visualizá-lo surgia a mensagem "documento não encontrado no armazenamento local". Identificamos a causa: em certos casos o arquivo não era incluído no backup, mas a informação sobre ele era restaurada mesmo assim, deixando um registro "fantasma" na tela.',
    fixes: [
      'Ao salvar um backup, o sistema agora avisa quando algum documento não pôde ser incluído no arquivo .zip, em vez de deixá-lo de fora sem aviso.',
      'Ao restaurar um backup, um documento sem o arquivo correspondente dentro do .zip deixa de aparecer no Dashboard como se estivesse completo — o sistema avisa quais documentos precisam ser reenviados, evitando a mensagem de erro ao tentar abri-los.',
    ],
  },
  {
    date: '02 de agosto de 2026',
    title: 'Ajustes de usabilidade na tela de Consolidação',
    description: 'Melhorias na tela de Consolidação para reduzir rolagem e evitar retrabalho no preenchimento.',
    improvements: [
      'Os botões Auditoria IA, Instrução do SIPAC e Gerar Pacote PDF agora ficam em uma linha própria acima das abas Requerimento/Memorial, sem disputar espaço com elas.',
      'A seção do Memorial textual pode ser recolhida com um clique, facilitando o acesso à Autodeclaração Legal e aos botões de exportação sem rolar por um memorial extenso.',
    ],
    fixes: [
      'As marcações da Autodeclaração Legal (veracidade, não-duplicidade, atividades não ordinárias) agora são salvas automaticamente e permanecem marcadas ao sair e voltar à sessão.',
    ],
  },
  {
    date: '02 de agosto de 2026',
    title: 'Instrução do processo no SIPAC direto na tela',
    description: 'Depois de montar o dossiê, criar o processo no SIPAC era um passo às cegas: cada servidor escolhia por conta própria a classificação, o assunto e a ordem de anexação dos documentos, o que gerava processos mal instruídos e devolvidos pela comissão. Agora a tela de Consolidação tem um roteiro pronto para essa etapa.',
    features: [
      'Novo botão "Instrução do SIPAC" na tela de Consolidação, ao lado de "Auditoria IA" e "Gerar Pacote PDF". Fica disponível assim que todas as pendências do checklist são resolvidas — inclusive depois de gerar o pacote, para consultar com o SIPAC já aberto ao lado.',
      'O roteiro aberto no botão mostra, em três blocos: os dados para cadastrar o processo (classificação, assunto, interessado e natureza, cada um com botão de copiar); a ordem exata de anexação dos arquivos do pacote gerado, incluindo a portaria de concessão anterior quando ela existir no seu caso; e o passo a passo das telas do SIPAC até movimentar o processo para a comissão.',
    ],
    improvements: [
      'Nada de arquivo novo: o roteiro aparece só na tela, não gera nenhum download além do pacote ZIP que já existia.',
    ],
  },
  {
    date: '28 de julho de 2026',
    title: 'Correção: links institucionais e autodeclarações sem página no dossiê exportado',
    description: 'Um item lançado por link institucional (ou por autodeclaração) sem que o arquivo tivesse sido baixado e anexado automaticamente era salvo normalmente, mas desaparecia por completo do PDF unificado de comprovantes — o Memorial registrava o item sem nenhuma página de evidência, e o sistema avaliador não tinha como conferir o que foi declarado.',
    fixes: [
      'Todo lançamento por link institucional ou autodeclaração agora gera uma página própria no PDF unificado de comprovantes, com os links informados (ou a nota de autodeclaração) e as observações do servidor — mesmo quando o download automático do link não é feito ou falha.',
      'O Memorial deixa de registrar página "0" para esses lançamentos: a referência agora aponta para a página de evidência real incluída no pacote.',
    ],
  },
  {
    date: '28 de julho de 2026',
    title: 'Diploma ou certificado no dossiê e mais privacidade no sistema',
    description: 'O pacote do processo passou a exigir e incluir o comprovante da escolaridade utilizado no pedido. Para reduzir a coleta de dados pessoais, o cadastro do servidor também deixou de solicitar telefone e e-mail.',
    features: [
      'Novo campo obrigatório para anexar o diploma ou certificado de escolaridade entre os documentos de instrução do processo.',
      'O diploma ou certificado é incluído no pacote exportado em arquivo próprio, identificado para conferência automática pelo sistema avaliador.',
    ],
    improvements: [
      'O checklist de consolidação agora considera o diploma ou certificado juntamente com a portaria de estabilidade e os três extratos SIAPE obrigatórios.',
      'O sistema avaliador reconhece o novo documento, mostra sua situação no checklist e permite consultá-lo durante a análise.',
    ],
    fixes: [
      'Os campos cadastrais de telefone e e-mail do servidor foram retirados do sistema e deixaram de integrar o perfil, as validações e os documentos gerados.',
    ],
  },
  {
    date: '27 de julho de 2026',
    title: 'Editor visual (WYSIWYG) no Memorial Descritivo',
    description: 'O campo do Memorial deixou de ser um texto simples: agora é um editor visual, com barra de formatação, que mostra negrito, títulos e listas prontos na tela — sem exibir os símbolos de Markdown (#, **, -) usados por trás.',
    features: [
      'Barra de ferramentas no campo do Memorial com Negrito, Itálico, Título, Subtítulo, Texto normal, Lista com marcadores e Lista numerada.',
      'Texto colado da IA (ou de qualquer fonte) com formatação Markdown é interpretado automaticamente e exibido já formatado, sem precisar editar os símbolos manualmente.',
    ],
    fixes: [
      'Corrigido: subtítulos de nível 3 ou mais profundo (ex.: "### Requisito I") apareciam do mesmo tamanho do título principal do Memorial, tanto no editor quanto na pré-visualização — agora seguem uma hierarquia visual clara e proporcional ao PDF exportado.',
      'Corrigido: quando a IA separava cada item de uma lista com marcadores por linha em branco, cada item virava uma lista independente de um único elemento; agora são reconhecidos e agrupados como uma lista única, tanto na tela quanto no PDF.',
    ],
  },
  {
    date: '24 de julho de 2026',
    title: 'Aviso de margem de pontuação para organizar comprovantes',
    description: 'O painel agora orienta, de forma não bloqueante, quando a pontuação registrada alcança uma margem estimada de 25% acima do mínimo do nível pleiteado.',
    improvements: [
      'O aviso só é apresentado após o preenchimento dos documentos processuais obrigatórios e deixa claro que a pontuação é uma estimativa sujeita à análise da comissão.',
      'Marcadores discretos ao lado da pontuação, no cabeçalho e no cartão do Dashboard, mantêm a orientação disponível mesmo depois de fechar o banner; basta passar o mouse para ler a nota.',
      'Fechar o banner oculta apenas a mensagem expandida para aquele processo e nível, sem impedir novos anexos nem remover os indicadores contextuais.',
    ],
  },
  {
    date: '22 de julho de 2026',
    title: 'Correção de pontos de interrogação e suporte expandido a Markdown no Memorial Descritivo',
    description: 'Corrigida a geração do Memorial Descritivo no PDF exportado e na visualização em tela, eliminando a aparição de pontos de interrogação em quebras de linha e caracteres especiais. O leitor de Markdown também ganhou suporte completo a listas numeradas e marcadores gráficos.',
    improvements: [
      'Suporte estendido a Markdown no Memorial: listas ordenadas numeradas (1., 2.) e listas com marcadores gráficos (•, ◦, ▪, *, -) agora são identificadas e formatadas de forma limpa e estruturada no PDF exportado e na pré-visualização.',
      'Instruções de formatação otimizadas no prompt da IA para redigir minutas de Memorial em Markdown limpo, compatível com a exportação final.',
    ],
    fixes: [
      'Corrigido: quebras de linha simples dentro de parágrafos do Memorial e caracteres Unicode especiais (reticências, travessões, aspas curvas, marcadores gráficos e caracteres invisíveis de largura zero) podiam ser convertidos em pontos de interrogação (?) no PDF. A higienização foi aprimorada para preservar a quebra de linha e normalizar a pontuação sem gerar caracteres espúrios.',
    ],
  },
  {
    date: '22 de julho de 2026',
    title: 'IA reconhece presidência de comissão mesmo quando a portaria não a nomeia expressamente',
    description: 'Muitas portarias de designação de comissão não escrevem "Presidente: [Nome]" ao lado de cada membro — o texto introdutório (Art. 1º) costuma atribuir a presidência ao primeiro nomeado da relação (ex.: "sob a presidência do primeiro"). A IA passou a reconhecer esse padrão em todas as etapas que avaliam presidência/coordenação de comissão (item 2) versus participação como membro comum (item 3).',
    improvements: [
      'Dossiê Inteligente (triagem inicial), Auditoria estruturada, "Validar com IA" de um lançamento e Auditoria consolidada narrativa agora identificam a cláusula de presidência automática e conferem a posição do servidor na lista nomeada, na ordem do documento (não alfabética), antes de classificar ou corrigir o item.',
      'O catálogo normativo (item-2 e item-3) foi atualizado com essa orientação, reduzindo o risco de a IA rebaixar indevidamente uma designação de presidência para "membro comum" só porque a palavra "presidente" não aparece ao lado do nome do servidor.',
    ],
  },
  {
    date: '20 de julho de 2026',
    title: 'Módulo de Auditoria centralizado, revisão "mastigada" e IA mais confiável',
    description: 'A maior atualização do sistema até agora: as propostas de ajuste da IA — vindas do Dossiê Inteligente, da Consolidação ou da validação de um lançamento individual — deixam de viver dentro de modais frágeis e passam a ter uma central própria, persistente e muito mais clara. Junto disso, vieram correções importantes de precisão da IA e suporte a formatação de texto no Memorial.',
    features: [
      'Novo Módulo de Auditoria (aba própria no menu): reúne todas as propostas de ajuste da IA em um só lugar, com filtros por status (pendente/aprovada/rejeitada/aplicada) e por origem (Consolidar, Dossiê Inteligente ou validação individual). As propostas ficam salvas mesmo se você fechar a tela — nada mais se perde ao sair de um modal.',
      'Painel "Como está hoje → Como ficará": cada proposta mostra lado a lado o valor atual e o valor após a correção (quantidade, período, item e pontos), com o impacto exato na pontuação daquele lançamento antes de você decidir.',
      'Projeção da pontuação do dossiê: a barra de aplicação mostra a simulação do total de pontos ("161 → 156,5 pts") somando o efeito de todas as propostas já aprovadas, antes de confirmar.',
      'Indicação de documentos a remover: quando a IA identifica que um comprovante específico não sustenta o fato lançado (ex.: portaria que designa o servidor como membro comum, não como presidente), ela agora pode indicar exatamente qual documento desvincular do lançamento — evitando que um comprovante inválido fique perdido no dossiê e gere diligência da comissão.',
      'Visualização de documentos direto na Auditoria: cada proposta lista os comprovantes envolvidos com um botão de pré-visualização (abre o PDF sem sair da tela) e um atalho "Abrir lançamento" para editar rapidamente.',
      'Divisão automática em lotes: tanto o prompt de auditoria final (Consolidar) quanto o prompt de classificação inicial (Dossiê Inteligente) agora se dividem sozinhos em vários lotes quando o dossiê é grande, com uma trilha de progresso visual (lote 1, 2, 3...), avanço automático ao colar cada resposta e aviso claro de quando um lote foi concluído — evita que a IA perca qualidade ou falhe com prompts grandes demais.',
      '"Validar com IA" agora analisa todos os documentos do lançamento: antes, quando um lançamento tinha vários comprovantes anexados, apenas o primeiro era enviado para a IA analisar. Agora todos são incluídos, e a resposta da IA se integra diretamente ao módulo de Auditoria.',
      'Suporte a Markdown no Memorial: negrito (**texto**), itálico (*texto*), títulos (#) e listas (-) digitados no campo do Memorial agora aparecem formatados de verdade — tanto na pré-visualização em tela quanto no PDF final exportado.',
    ],
    improvements: [
      'Botões explícitos de "Aprovar correção" / "Rejeitar" / "Desfazer decisão" no lugar de ícones, e um indicador "Você revisou X de Y propostas" com barra de progresso.',
      'Guia "Como funciona esta tela" na primeira visita ao módulo de Auditoria, explicando o fluxo revisar → decidir → aplicar.',
      'Propostas do tipo "Sinalizar" foram renomeadas para "Verificação manual" e ganharam um botão próprio ("Concluir verificação"), deixando claro que são apenas um alerta e não alteram nada sozinhas.',
      'O prompt de auditoria foi reforçado para instruir a IA a analisar TODOS os documentos de um lançamento (não só o primeiro) e a nunca propor uma "correção" que resulte no mesmo valor já registrado.',
    ],
    fixes: [
      'Corrigido: a IA podia propor "ajustar quantidade" ou "reclassificar" informando exatamente o mesmo valor/item já registrado — uma resposta contraditória que confundia a revisão. Essas propostas agora são descartadas automaticamente, com aviso explicativo.',
    ],
  },
  {
    date: '16 de julho de 2026',
    title: 'Vídeo tutorial integrado ao sistema',
    description: 'O vídeo orientativo do Assistente RSC-TAE, antes disponível apenas no YouTube, agora pode ser assistido sem sair do sistema, em três pontos de acesso.',
    features: [
      'Botão "Ver Vídeo Tutorial" na tela inicial (login/seleção de sessão), ao lado de "Ver Novidades do Sistema".',
      'Banner "Novo por aqui? Assista ao vídeo tutorial" no topo do Dashboard, logo abaixo dos dados do servidor.',
      'Vídeo embutido diretamente na aba "Guia e Informações" de Ajuda & Novidades, com atalho para abrir no YouTube.',
    ],
  },
  {
    date: '16 de julho de 2026',
    title: 'Detecção de prompt colado por engano nas telas de IA',
    description: 'Um erro comum era colar de volta o próprio prompt de classificação/auditoria no campo de resposta da IA, em vez da resposta gerada por ela. O sistema agora identifica isso de forma determinística e evita o processamento incorreto.',
    fixes: [
      'Nos campos "Cole aqui a resposta da IA" do Dossiê Inteligente (Análise externa e Auditoria IA) e da Auditoria semântica/Memorial da Consolidação, o sistema compara o início do texto colado com o início do prompt gerado; se coincidirem, exibe um aviso específico orientando a colar a resposta da IA, e desabilita o botão "Processar resposta" até a correção.',
    ],
  },
  {
    date: '13 de julho de 2026',
    title: 'Blindagem contra documentos duplicados e Dossiê incremental',
    description: 'O sistema passou a garantir uma única cópia de cada documento, independentemente da origem do envio, e a prevenir dupla contagem de fatos já lançados. O Dossiê Inteligente agora também funciona para quem já tem documentos e lançamentos na sessão.',
    features: [
      'Dossiê incremental: nova seção "Documentos já no sistema" na etapa 1 permite incluir na triagem documentos enviados anteriormente, sem re-enviar arquivos.',
      'Mesclar ao lançamento existente: sugestões do mesmo item de um lançamento já registrado podem ser fundidas a ele (comprovantes, períodos e pontos recalculados), em vez de criar lançamento duplicado.',
      'O prompt de classificação passou a incluir um bloco compacto com os itens já lançados, e a IA sinaliza sugestões cujo fato já é coberto por lançamento existente (selo "IA: já contemplado").',
      'Detecção de conteúdo idêntico: documentos com transcrição igual (mesmo comprovante re-escaneado ou re-exportado) são apontados no upload e na lista da triagem.',
      'Aviso de período já coberto: sugestões de itens calculados por tempo mostram a sobreposição com períodos de lançamentos existentes do mesmo item.',
    ],
    improvements: [
      'Ao confirmar uma sugestão cujos documentos já pontuam em outro lançamento, o sistema alerta (item diferente) ou bloqueia com orientação de mesclagem (mesmo item).',
      'Uploads de arquivos repetidos em qualquer tela (Dossiê, Itens, lançamento existente) sempre reaproveitam o registro original — nunca é armazenada uma segunda cópia — e informam onde o documento já pontua.',
      'Referências por link institucional com o mesmo conjunto de links passam a reaproveitar o documento de referência existente.',
    ],
    fixes: [
      'Corrigida brecha em que o mesmo arquivo selecionado duas vezes no mesmo lote de upload era armazenado em duplicidade.',
      'Documentos de instrução processual deixaram de criar cópia quando o mesmo arquivo já existia no sistema; se o arquivo já pontua como comprobatório, o sistema bloqueia a reclassificação e orienta o usuário.',
    ],
  },
  {
    date: '10 de julho de 2026',
    title: 'Dossiê Inteligente de Documentos',
    description: 'Nova ferramenta que ajuda o servidor a descobrir onde cada documento se encaixa no rol de itens RSC, revisar as sugestões e fazer a auditoria IA — tudo em um fluxo só, usando uma IA externa no padrão copiar/colar já praticado pelo sistema.',
    features: [
      'Upload em massa de documentos com transcrição automática (PDF, OCR e texto) e marcação de arquivos potencialmente ilegíveis.',
      'Geração de prompt de classificação com o catálogo de itens e as transcrições, com loteamento automático para respeitar o limite de contexto da IA externa.',
      'Colagem da resposta JSON da IA com parser tolerante — aceita cercas de código, texto ao redor e múltiplas colagens.',
      'Revisão de sugestões com badges de confiança, preview de pontos, edição inline de item e períodos, detecção de conflitos e confirmação em lote das sugestões de alta confiança.',
      'Quarta etapa: Auditoria IA estruturada que retorna operações automáticas (remover, reclassificar, ajustar períodos/quantidade, sinalizar) em JSON, com revisão e aplicação em lote das operações aprovadas.',
      'Onboarding visual: ao entrar pela primeira vez em uma sessão, um spotlight destaca o botão do Dossiê Inteligente no menu lateral e um tutorial em vídeo (4 etapas) explica o fluxo completo — desde o upload até a auditoria.',
    ],
    improvements: [
      'A extração de transcrição foi refatorada para um módulo compartilhado, beneficiando também a Auditoria IA.',
      'O estado da triagem é incluído no export/import de sessão, permitindo retomar o trabalho em outra máquina.',
      'O catálogo normativo embutido no prompt passou a incluir critérios de enquadramento, fatos mínimos, documentos típicos, documentos insuficientes e hipóteses de exclusão por item, aumentando a precisão das sugestões da IA.',
      'O prompt da Auditoria IA agora informa o modo de cálculo de cada lançamento e orienta a IA a diferenciar correções de quantidade (itens manuais) de correções de datas (itens calculados por tempo).',
      'A aba Documentos ganhou o filtro "Instrução processual" para isolar os documentos funcionais (portarias e extratos SIAPE) dos comprovantes de atividades.',
    ],
    fixes: [
      'A cópia para a área de transferência agora remove caracteres de controle invisíveis (null bytes etc.) que podiam truncar silenciosamente o prompt copiado.',
      'Lançamentos criados em sessões antigas com identificadores duplicados passam a receber novos IDs automaticamente, evitando conflitos com as sugestões e operações da triagem/auditoria.',
    ],
  },
  {
    date: '10 de julho de 2026',
    title: 'Memorial textual e documentos funcionais no pacote RSC',
    description: 'O fluxo de consolidação foi ajustado às definições da comissão e passou a separar o requerimento tabular do memorial narrativo.',
    features: [
      'Novo editor de Memorial, com salvamento automático e geração de prompt para criar uma minuta baseada nos lançamentos e comprovantes.',
      'Inclusão da portaria de estabilidade e dos extratos SIAPE CDCOINDFUN, CACOPOSPRO e CACODETPFU como documentos próprios de instrução.',
      'O pacote final reúne as fichas funcionais em um único PDF e mantém separadas a portaria de estabilidade, a eventual concessão anterior e as comprovações.',
    ],
    improvements: [
      'O cabeçalho do sistema passa a exibir as metas de pontos e de itens do nível elegível ao lado dos totais já lançados, facilitando o acompanhamento do progresso.',
      'O checklist de requisitos da tela Consolidar agora é recolhível/expansível, deixando a tela mais limpa quando todas as exigências já foram atendidas.',
      'O rótulo do sistema no cabeçalho foi ajustado de "RSC-PCCTAE" para "Assistente RSC-TAE" para diferenciar a ferramenta do próprio regime de concessão.',
    ],
    fixes: [
      'A listagem de critérios e pontuação deixou de ser repetida no Memorial e permanece exclusivamente na seção apropriada do requerimento.',
      'O requerimento preserva a redação literal do formulário MEC e o sistema sinaliza a divergência entre a remissão ao art. 4º do modelo e a enumeração material dos requisitos no art. 3º do Decreto.',
      'A exclusão de uma sessão na tela inicial agora exige confirmação em modal, evitando perda acidental de todos os dados.',
    ],
  },
  {
    date: '10 de julho de 2026',
    title: 'Navegação reorganizada e fim do Wizard',
    description: 'O Wizard de Mapeamento Objetivado foi substituído pelo Dossiê Inteligente e a página de Legislação passou a integrar a aba Ajuda & Novidades, unificando as informações de apoio em um único local.',
    improvements: [
      'Wizard substituído: a ferramenta de Mapeamento Objetivado (perguntas objetivas) foi retirada e substituída pelo Dossiê Inteligente, que descobre os itens por IA a partir dos próprios documentos — sem necessidade de responder a questionários.',
      'Legislação integrada a Ajuda & Novidades: a página isolada de Legislação foi movida para uma aba dentro de Ajuda & Novidades, concentrando legislação, FAQ, comparativo de mudanças e novidades do sistema em um só lugar.',
    ],
  },
  {
    date: '08 de julho de 2026',
    title: 'Requerimento atualizado conforme a Portaria MEC nº 608/2026',
    description: 'O modelo de requerimento do pacote RSC foi adequado ao formulário padrão estabelecido pelo Ministério da Educação para solicitação do RSC-PCCTAE.',
    features: [
      'O PDF do requerimento agora inclui a seção "Descrição das Atividades por Requisito Legal", com os critérios I a VI, subtotais por critério e total acumulado.',
      'A prévia da aba Consolidar foi alinhada ao novo modelo, incluindo os mesmos campos, rótulos e a declaração de conformidade legal prevista na portaria.',
      'A declaração final passou a seguir o texto padrão da Portaria MEC nº 608, de 7 de julho de 2026, publicada no DOU em 8 de julho de 2026.',
    ],
    improvements: [
      'Os rótulos de saldo de pontuação, processo anterior e identificação funcional foram ajustados para acompanhar o novo formulário mínimo do Ministério da Educação.',
      'Os nomes dos critérios foram uniformizados no requerimento e no memorial para refletir a redação do modelo oficial.',
    ],
  },
  {
    date: '07 de julho de 2026',
    title: 'Revisão mais clara de documentos e itens',
    description: 'A organização dos comprovantes e dos itens ficou mais consistente, com menos dúvidas na hora de revisar, copiar prompts e ajustar lançamentos.',
    improvements: [
      'Os documentos usados no dossiê agora seguem uma ordem única e recebem a mesma numeração na aba Documentos, no pacote consolidado e no prompt da Auditoria IA.',
      'A aba Documentos permite desvincular um comprovante diretamente e abrir o item correspondente para revisar quantidade, período e pontuação quando necessário.',
      'O detalhe do documento agora acompanha a lista na aba Documentos, facilitando a revisão de itens mais abaixo na tela.',
      'Na Auditoria IA, o prompt pode ser selecionado por completo para cópia manual com Ctrl+C ou botão direito, além da opção de baixar em TXT.',
      'Na lista de itens, a situação ficou mais objetiva: os filtros agora diferenciam apenas itens sem lançamento e itens já lançados.',
    ],
  },
  {
    date: '06 de julho de 2026',
    title: 'Múltiplos períodos por atividade e cálculo na edição',
    description: 'Agora você pode declarar várias portarias/períodos de datas para uma mesma atividade e recalcular seus pontos de forma automática também na tela de edição.',
    features: [
      'Lançamento com múltiplos períodos: Para atividades com pontuação calculada por tempo (ex.: atuação como responsável por setor/unidade), agora é possível adicionar vários períodos de início e fim no mesmo lançamento. O assistente soma os dias declarados e desconta períodos sobrepostos automaticamente para garantir uma pontuação justa.',
      'Calcular na edição: Adicionamos o botão "Calcular" dentro do formulário de edição de lançamentos existentes. Ao alterar ou adicionar datas de uma atividade salva, você pode recalcular a nova quantidade automaticamente com apenas um clique.',
    ],
  },
  {
    date: '05 de julho de 2026',
    title: 'Auditoria IA com plano de ação e rol compartilhado com o Analisador',
    description: 'A auditoria semântica ficou mais útil e a base de critérios passou a ser compartilhada com o sistema Analisador de Processos RSC da Comissão.',
    features: [
      'A Auditoria IA (tela de Consolidação) agora orienta a IA a encerrar a resposta com um plano de ação passo a passo, simples e didático, dizendo exatamente o que corrigir na sua documentação (ex.: qual lançamento duplicado excluir e em qual item do sistema).',
    ],
  },
  {
    date: '03 de julho de 2026',
    title: 'Alinhamento ao Decreto nº 13.048/2026',
    description: 'Atualização da base normativa e das telas principais após a publicação do decreto regulamentador do RSC-PCCTAE.',
    features: [
      'Página de legislação atualizada com o Decreto nº 13.048/2026 como regulamento vigente.',
      'Avisos do sistema ajustados para versão beta baseada no decreto publicado, substituindo a comunicação anterior.',
    ],
    improvements: [
      'Declarações do requerimento e do memorial reforçadas com não duplicidade entre critérios, vedação de uso de pontos anteriores e atividades não ordinárias.',
      'Validação de concessão anterior passou a exigir a data da última concessão para conferir o interstício de 3 anos.',
    ],
  },
  {
    date: '11 de junho de 2026',
    title: 'Mais facilidade para ajustar e alterar seus comprovantes salvos',
    description: 'Agora ficou muito mais simples gerenciar os documentos de cada atividade e fazer ajustes nas informações que você já cadastrou.',
    features: [
      'Controle individual de documentos: mesmo após realizar um carregamento em lote para uma atividade, você pode adicionar ou remover comprovantes de forma individual, sem precisar apagar ou refazer todo o lançamento (válido para lançamentos realizados a partir de 11/06/2026).',
      'Edição simplificada de lançamentos: se você precisar corrigir datas, quantidades ou observações de um item já salvo, basta clicar em "Editar lançamento" diretamente na aba de histórico.',
    ],
  },
  {
    date: '08 de junho de 2026',
    title: 'Feedback com Imagens, Print da Tela e Correções de Layout',
    description: 'O canal de feedback ganhou suporte a anexo de imagens e captura de tela diretamente pelo widget, além de correções de sobreposição de botões na tela de Itens e na barra lateral.',
    features: [
      'Anexo de imagens no feedback: é possível enviar até 3 imagens (máx. 5 MB cada) junto com qualquer mensagem de feedback. As imagens ficam disponíveis para a equipe no painel de análise.',
      'Print da tela integrado: novo botão "Print da tela" no widget de feedback captura automaticamente o estado atual da tela — excluindo o próprio modal — e anexa a imagem à mensagem, facilitando o reporte visual de bugs e sugestões.',
    ],
    fixes: [
      'O botão de Feedback foi reposicionado para o canto inferior esquerdo da tela, eliminando a sobreposição com botões de ação do sistema.',
    ],
  },
  {
    date: '01 de junho de 2026',
    title: 'Autocompletar de Nome e Validações de Apoio',
    description: 'O sistema agora auxilia no preenchimento de seus dados funcionais e avisa sobre possíveis inconsistências de forma automática, garantindo que você tenha total controle para avançar.',
    features: [
      'Busca inteligente por Nome: Ao iniciar a digitação do Nome Completo, o assistente pesquisa em uma base de dados pública de servidores para preencher automaticamente seu cargo, unidade de lotação e situação funcional.',
      'Uso opcional e não bloqueante: A base de dados serve apenas como apoio. Se você não encontrar seu nome na lista ou se houver divergências, poderá digitar seus dados manualmente e continuar o processo normalmente sem qualquer impedimento.',
      'Aumento do limite de dígitos do SIAPE: O campo agora aceita até 9 caracteres, permitindo a inserção de SIAPEs mais recentes com 8 dígitos e outras formatações.',
      'Correção de perfil descomplicada: Você agora pode salvar alterações no seu nome ou SIAPE sem ser obrigado a preencher todos os outros dados adicionais (como e-mail, cargo e data de início) imediatamente. A validação total só é exigida no momento de gerar o PDF final.',
      'Novo fluxo visual: O formulário foi reordenado de forma mais lógica e natural, solicitando o Nome Completo primeiro, seguido do SIAPE e da Escolaridade Atual.',
    ],
  },
  {
    date: '28 de maio de 2026',
    title: 'Central de Ajuda e Otimização para Dispositivos Móveis',
    description: 'Implementação de suporte integrado e reestruturação completa da interface responsiva para celulares.',
    features: [
      'Criação da aba "Ajuda & Novidades" integrada na barra lateral de navegação para usuários logados.',
      'Desenvolvimento do modal de novidades em overlay diretamente na tela inicial (Landing Screen).',
    ],
    improvements: [
      'Reorganização do cabeçalho em duas linhas no mobile, isolando estatísticas de pontos em painel de largura cheia e evitando compressão de texto.',
      'Integração do canal de Feedback como um botão plano de mesmo tamanho diretamente no rodapé de dispositivos móveis.',
    ],
    fixes: [
      'Correção de sobreposição no mobile: elevação do z-index da gaveta de itens (z-[120]) para que os botões de anexo fiquem totalmente livres.',
      'Sincronização de padding inferior no layout principal para alinhar com a altura do rodapé móvel (60px), removendo a barra em branco.',
    ],
  },
  {
    date: '26 de maio de 2026',
    title: 'Auditoria Inteligente e Observações',
    description: 'Adicionada auditoria assistida por IA e maior controle nas observações dos itens lançados.',
    features: [
      'Implementação do Assistente de Auditoria Inteligente (AI Audit Prompt) para validação automatizada de conformidade.',
      'Inclusão de campo de observações personalizadas para cada item lançado.',
    ],
    improvements: [
      'Exportação e inclusão automática de observações e metadados no relatório final em PDF.',
    ],
    fixes: [
      'Correção do cálculo de pontuação para o item de atividades em sistemas estruturantes.',
    ],
  },
  {
    date: '21 de maio de 2026',
    title: 'Suporte a Arquivos Maiores e Ajustes de UX',
    description: 'Aprimoramento do fluxo de anexo de documentos, suporte visual e correção de metadados do PDF.',
    improvements: [
      'Aumento do limite de tamanho máximo de upload de 5 MB para 20 MB.',
      'Inclusão de recursos de ajuda de mídia contextual e novos ativos de fonte para PDFs.',
      'Ajuste no rótulo de "Data de Ingresso IFE" para "Data de Início do Efetivo Exercício" com tooltip explicativo.',
    ],
    fixes: [
      'Correção na exibição da quantidade de eventos mostrada no memorial descritivo.',
    ],
  },
  {
    date: '19 de maio de 2026',
    title: 'Gerenciamento de Documentos e Mesclagem de PDFs',
    description: 'Grande atualização na visualização de arquivos carregados e processos de unificação de PDFs.',
    features: [
      'Criação de aba de "Documentos" dedicada para visualização e organização objetiva de comprovações.',
      'Adicionada função para remoção de documentos com modal de confirmação de segurança.',
    ],
    improvements: [
      'Injeção de tags de metadados de RSC (visando subsidiar futura proposta de sistema de análise de documentação pela comissão) e melhoria na rotina de unificação de comprovantes PDF.',
      'Adicionados cabeçalhos de controle de cache para garantir o carregamento do código atualizado.',
    ],
    fixes: [
      'Correção na mesclagem de arquivos PDF contendo múltiplas páginas.',
      'Prevenção de falsos positivos no alerta de arquivo duplicado.',
    ],
  },
];
