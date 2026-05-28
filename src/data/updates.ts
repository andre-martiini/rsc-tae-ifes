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
