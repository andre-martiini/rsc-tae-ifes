/**
 * Utility to download files from a URL.
 * Handles CORS limitations by providing clear feedback to the user.
 */
export async function downloadFileFromUrl(url: string, useProxy = true): Promise<File> {
    const finalUrl = useProxy ? `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` : url;
    try {
        const response = await fetch(finalUrl);

        if (!response.ok) {
            throw new Error(`Erro ao acessar o link: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('Content-Type') || 'application/pdf';
        const blob = await response.blob();

        // Try to get filename from Content-Disposition header
        let fileName = 'documento_baixado.pdf';
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1].replace(/['"]/g, '');
            }
        } else {
            // Fallback: extract from URL
            try {
                const urlObj = new URL(url);
                const pathSegments = urlObj.pathname.split('/');
                const lastSegment = pathSegments[pathSegments.length - 1];
                if (lastSegment && lastSegment.includes('.')) {
                    fileName = decodeURIComponent(lastSegment);
                }
            } catch {
                // use default
            }
        }

        // Ensure it has .pdf extension if it's supposed to be a PDF
        if (contentType.includes('pdf') && !fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }

        return new File([blob], fileName, { type: contentType });
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error(
                'Bloqueio de Segurança (CORS): O servidor onde o arquivo está hospedado não permite o download direto pelo navegador. ' +
                'Tente baixar o arquivo manualmente e anexá-lo ao sistema.'
            );
        }
        throw error;
    }
}
