type FeedbackNotificationPayload = {
  feedbackId?: string;
  feedback?: {
    nome?: string;
    email?: string;
    mensagem?: string;
    tipo?: string;
    tela?: string;
    rota?: string;
    resolucao?: string;
    navegador?: string;
    attachments?: Array<{
      url?: string;
      name?: string;
      size?: number;
      mimeType?: string;
    }>;
  };
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_ID || '')
    .split(',')
    .map((chatId) => chatId.trim())
    .filter(Boolean);

  if (!botToken || chatIds.length === 0) {
    return null;
  }

  const messageThreadId = process.env.TELEGRAM_MESSAGE_THREAD_ID
    ? Number(process.env.TELEGRAM_MESSAGE_THREAD_ID)
    : undefined;

  return {
    botToken,
    chatIds,
    messageThreadId: Number.isFinite(messageThreadId) ? messageThreadId : undefined,
  };
}

function getFeedbackUrl(feedbackId: string): string {
  const appUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
    ? process.env.APP_URL.replace(/\/$/, '')
    : '';
  return appUrl ? `${appUrl}/?feedbackId=${encodeURIComponent(feedbackId)}` : '';
}

function truncateTelegramMessage(value: string): string {
  const maxLength = 3900;
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 40)}\n\n[Mensagem truncada no Telegram]`;
}

function getTipoLabel(tipo?: string): string {
  const labels: Record<string, string> = {
    bug: 'Bug / Erro',
    sugestao: 'Sugestao',
    elogio: 'Elogio',
    duvida: 'Duvida',
    outro: 'Outro',
  };

  return tipo ? labels[tipo] || tipo : 'nao informado';
}

function getSeverityLabel(tipo?: string, mensagem?: string): string {
  const normalizedTipo = (tipo || '').toLowerCase();
  const normalizedMessage = (mensagem || '').toLowerCase();

  if (
    normalizedTipo === 'bug' ||
    ['erro', 'bug', 'trava', 'travou', 'crash', 'nao consigo', 'não consigo'].some((term) =>
      normalizedMessage.includes(term),
    )
  ) {
    return 'ALTA';
  }

  if (normalizedTipo === 'duvida' || normalizedTipo === 'sugestao') {
    return 'MEDIA';
  }

  return 'BAIXA';
}

async function sendTelegramNotification(feedbackId: string, feedback: NonNullable<FeedbackNotificationPayload['feedback']>) {
  const config = getTelegramConfig();
  if (!config) {
    return { skipped: true, reason: 'missing_telegram_config' };
  }

  const feedbackUrl = getFeedbackUrl(feedbackId);
  const attachmentsCount = feedback.attachments?.length || 0;
  const severityLabel = getSeverityLabel(feedback.tipo, feedback.mensagem);
  const lines = [
    '<b>Sistema RSC-TAE - Novo feedback recebido</b>',
    '',
    'Origem: <b>Sistema RSC-TAE</b>',
    '',
    `<b>ID:</b> ${escapeHtml(feedbackId)}`,
    `<b>Nome:</b> ${escapeHtml(feedback.nome || 'Anonimo')}`,
    `<b>E-mail:</b> ${escapeHtml(feedback.email || 'nao informado')}`,
    `<b>Tela:</b> ${escapeHtml(feedback.tela || 'Geral')}`,
    `<b>Severidade:</b> ${escapeHtml(severityLabel)}`,
    `<b>Tipo:</b> ${escapeHtml(getTipoLabel(feedback.tipo))}`,
    `<b>Rota:</b> ${escapeHtml(feedback.rota || '/')}`,
    `<b>Resolucao:</b> ${escapeHtml(feedback.resolucao || 'nao capturada')}`,
    `<b>Navegador:</b> ${escapeHtml(feedback.navegador || 'nao capturado')}`,
    `<b>Anexos:</b> ${attachmentsCount}`,
    '',
    '<b>Mensagem:</b>',
    escapeHtml(feedback.mensagem || ''),
    '',
    feedbackUrl ? `<a href="${escapeHtml(feedbackUrl)}">Abrir sistema</a>` : 'Abra o painel para analisar este feedback.',
  ];
  const text = truncateTelegramMessage(lines.join('\n'));

  await Promise.all(config.chatIds.map(async (chatId) => {
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(config.messageThreadId ? { message_thread_id: config.messageThreadId } : {}),
      }),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`Telegram API returned ${response.status}: ${responseBody}`);
    }
  }));

  return { skipped: false };
}

export async function handleFeedbackNotificationRequest(request: Request) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Metodo nao permitido.' }, { status: 405 });
  }

  let payload: FeedbackNotificationPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON invalido.' }, { status: 400 });
  }

  const feedbackId = payload.feedbackId?.trim();
  const feedback = payload.feedback;

  if (!feedbackId || !feedback) {
    return jsonResponse({ error: 'feedbackId e feedback sao obrigatorios.' }, { status: 400 });
  }

  try {
    const result = await sendTelegramNotification(feedbackId, feedback);
    return jsonResponse({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('feedback-notification telegram_failed', error);
    return jsonResponse({ error: 'Falha ao enviar notificacao Telegram.' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  return handleFeedbackNotificationRequest(request);
}

export default {
  fetch(request: Request) {
    return handleFeedbackNotificationRequest(request);
  },
};
