/**
 * Utility to download files from a URL.
 * Handles CORS limitations by providing clear feedback to the user.
 */
export async function downloadFileFromUrl(url: string, useProxy = true): Promise<File> {
    const proxies = [
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    ];

    let lastError: any = null;

    // Se useProxy for false, tenta o link direto primeiro
    if (!useProxy) {
        try {
            return await fetchAndCreateFile(url);
        } catch (err) {
            lastError = err;
        }
    }

    // Tenta cada proxy em sequência
    for (const getProxyUrl of proxies) {
        try {
            const proxyUrl = getProxyUrl(url);
            console.log(`Tentando baixar via proxy: ${proxyUrl}`);
            return await fetchAndCreateFile(proxyUrl, url);
        } catch (err) {
            console.warn(`Falha ao baixar via proxy:`, err);
            lastError = err;
            continue;
        }
    }

    // Se chegou aqui, todos falharam
    console.error("Erro final no download:", lastError);
    
    // Verifica se é um link do IFES para dar uma dica extra
    const isIfes = url.includes('ifes.edu.br');
    const extraTip = isIfes ? ' Este portal (GEDOC Ifes) costuma ter restrições de acesso que impedem o download automático por segurança.' : '';

    throw new Error(
        `Não foi possível baixar este link automaticamente${extraTip} ` +
        'Por favor, baixe o arquivo manualmente no portal e anexe o PDF aqui.'
    );
}

async function fetchAndCreateFile(fetchUrl: string, originalUrl?: string): Promise<File> {
    const response = await fetch(fetchUrl);

    if (!response.ok) {
        throw new Error(`Erro ao acessar o link: ${response.status}`);
    }

    const blob = await response.blob();
    
    // Se o blob for muito pequeno (ex: uma página de erro HTML), pode ser um falso positivo do proxy
    // PDF mínimo tem cerca de 1000 bytes geralmente, mas vamos ser conservadores
    if (blob.size < 600 && (blob.type.includes('text/html') || blob.type.includes('application/json'))) {
        throw new Error('O conteúdo retornado não parece ser um documento válido (possível erro do proxy ou redirecionamento).');
    }

    // Tenta determinar o contentType mais real
    let contentType = blob.type;
    if (!contentType || contentType === 'application/octet-stream' || contentType === 'text/plain') {
        contentType = response.headers.get('Content-Type') || 'application/pdf';
    }

    // Melhoria na extração do nome do arquivo
    let fileName = 'documento_gedoc.pdf';
    
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch && fileNameMatch[1]) {
            fileName = fileNameMatch[1].replace(/['"]/g, '');
        }
    } else {
        // Lógica específica para extrair IDs de documentos
        try {
            const urlToParse = originalUrl || fetchUrl;
            const urlObj = new URL(urlToParse);
            // Remove o jsessionid e parâmetros de busca
            const pathParts = urlObj.pathname.split(';')[0].split('/');
            const lastPart = pathParts[pathParts.length - 1];
            
            if (lastPart && lastPart.length > 5 && !lastPart.includes('.')) {
                fileName = `doc_${lastPart.substring(0, 8)}.pdf`;
            } else if (lastPart && lastPart.includes('.')) {
                fileName = lastPart;
            }
        } catch {
            // mantém o padrão
        }
    }

    // Garante a extensão pdf para o sistema se for PDF ou se não tiver extensão
    if (!fileName.toLowerCase().endsWith('.pdf') && (contentType.includes('pdf') || !fileName.includes('.'))) {
        fileName += '.pdf';
    }

    return new File([blob], fileName, { type: contentType });
}


