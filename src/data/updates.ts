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
