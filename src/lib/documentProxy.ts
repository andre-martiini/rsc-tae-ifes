const DEFAULT_ALLOWED_HOSTS = [
  'gedoc.ifes.edu.br',
  '.edu.br',
  '.gov.br',
  '.leg.br',
  '.jus.br',
];

const PDF_CONTENT_TYPES = ['application/pdf', 'application/octet-stream'];

function getAllowedHosts() {
  const configured = process.env.DOCUMENT_PROXY_ALLOWED_HOSTS
    ?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return configured?.length ? configured : DEFAULT_ALLOWED_HOSTS;
}

function isAllowedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return getAllowedHosts().some((entry) =>
    entry.startsWith('.') ? normalized.endsWith(entry) : normalized === entry,
  );
}

export async function handleDocumentProxyRequest(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('health') === '1') {
    return Response.json(
      { ok: true, service: 'document-proxy' },
      {
        status: 200,
        headers: {
          'X-Document-Proxy': 'rsc-tae',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  const target = searchParams.get('url')?.trim();
  if (!target) {
    return Response.json({ error: 'Informe a URL do documento.' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return Response.json({ error: 'URL do documento invalida.' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:') {
    return Response.json({ error: 'Apenas links HTTPS sao aceitos.' }, { status: 400 });
  }

  if (!isAllowedHostname(parsed.hostname)) {
    return Response.json(
      { error: `Dominio nao autorizado para proxy: ${parsed.hostname}` },
      { status: 403 },
    );
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      redirect: 'follow',
      headers: {
        Accept: 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.1',
        'User-Agent':
          'Mozilla/5.0 (compatible; RSC-TAE/1.0; +https://rsc-tae-ifes.vercel.app)',
      },
    });

    if (!upstream.ok) {
      console.error('document-proxy upstream_error', {
        status: upstream.status,
        url: parsed.toString(),
      });
      return Response.json(
        { error: `O repositorio institucional respondeu com status ${upstream.status}.` },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/pdf';
    if (!PDF_CONTENT_TYPES.some((allowed) => contentType.toLowerCase().includes(allowed))) {
      return Response.json(
        { error: `O link retornou um conteudo nao suportado: ${contentType}` },
        { status: 415 },
      );
    }

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Document-Proxy', 'rsc-tae');

    const contentDisposition = upstream.headers.get('content-disposition');
    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition);
    }

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('document-proxy fetch_failed', {
      url: parsed.toString(),
      error,
    });
    return Response.json(
      {
        error:
          'Nao foi possivel acessar esse link a partir do servidor. Tente novamente ou baixe o PDF manualmente no portal institucional.',
      },
      { status: 502 },
    );
  }
}
