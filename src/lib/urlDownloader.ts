import { normalizeInstitutionDocumentLink } from '../config/institution';

function parseFileName(contentDisposition: string | null, sourceUrl: string) {
  if (contentDisposition) {
    const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
    if (fileNameMatch?.[1]) {
      return fileNameMatch[1].replace(/['"]/g, '');
    }
  }

  try {
    const urlObj = new URL(sourceUrl);
    const pathSegments = urlObj.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment && lastSegment.includes('.')) {
      return decodeURIComponent(lastSegment);
    }
  } catch {
    // Keep fallback below.
  }

  return 'documento_baixado.pdf';
}

function startsWithPdfHeader(buffer: Uint8Array) {
  if (buffer.length < 5) return false;
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

export async function downloadFileFromUrl(url: string): Promise<File> {
  try {
    const normalizedUrl = normalizeInstitutionDocumentLink(url);
    const response = await fetch(`/api/document-proxy?url=${encodeURIComponent(normalizedUrl)}`);

    if (!response.ok) {
      let message = `Erro ao acessar o link: ${response.status}`;
      const responseType = response.headers.get('content-type') ?? '';

      if (responseType.includes('application/json')) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (payload?.error) {
          message = payload.error;
        }
      } else if (response.status === 404) {
        message =
          'A rota interna de download não está disponível nesta versão do sistema. Atualize o deploy ou baixe o PDF manualmente no portal institucional.';
      }

      throw new Error(message);
    }

    const contentType = response.headers.get('Content-Type') || 'application/pdf';
    const proxySignature = response.headers.get('X-Document-Proxy');
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());

    if (proxySignature !== 'rsc-tae') {
      throw new Error(
        'A rota interna de download nao respondeu como esperado. Isso normalmente indica que o deploy publicado ainda nao inclui a funcao /api/document-proxy.',
      );
    }

    if (!contentType.toLowerCase().includes('pdf') || !startsWithPdfHeader(bytes)) {
      const sample = new TextDecoder('utf-8')
        .decode(bytes.slice(0, 120))
        .replace(/\s+/g, ' ')
        .trim();

      if (sample.toLowerCase().includes('<!doctype') || sample.toLowerCase().includes('<html')) {
        throw new Error(
          'O sistema recebeu HTML em vez de PDF. Isso costuma acontecer quando a rota /api/document-proxy nao foi publicada no deploy atual.',
        );
      }

      throw new Error(
        `O link nao retornou um PDF valido para anexacao automatica. Tipo recebido: ${contentType}.`,
      );
    }

    const fileName = parseFileName(response.headers.get('Content-Disposition'), normalizedUrl);

    return new File([bytes], fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`, {
      type: contentType,
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        'Não foi possível alcançar a rota interna de download. Se o problema persistir, baixe o PDF manualmente no portal institucional e anexe-o ao sistema.',
      );
    }

    throw error;
  }
}
