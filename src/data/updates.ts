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
