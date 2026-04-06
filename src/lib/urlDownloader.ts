/**
 * Utility to download files from a URL.
 * Handles CORS limitations by providing clear feedback to the user.
 */
export async function downloadFileFromUrl(url: string, useProxy = true): Promise<File> {
    // Tenta usar um proxy que lida melhor com parâmetros complexos ou tenta acesso direto primeiro
    const finalUrl = useProxy ? `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` : url;
    
    try {
        const response = await fetch(finalUrl);

        if (!response.ok) {
            throw new Error(`Erro ao acessar o link: ${response.status}`);
        }

        const blob = await response.blob();
        const contentType = response.headers.get('Content-Type') || 'application/pdf';

        // Melhoria na extração do nome do arquivo para links do GEDOC
        let fileName = 'documento_gedoc.pdf';
        
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1].replace(/['"]/g, '');
            }
        } else {
            // Lógica específica para extrair IDs de documentos como o do GEDOC
            try {
                const urlObj = new URL(url);
                // Remove o jsessionid e parâmetros de busca para tentar pegar o ID do documento
                const pathParts = urlObj.pathname.split(';')[0].split('/');
                const lastPart = pathParts[pathParts.length - 1];
                
                if (lastPart && lastPart.length > 5) {
                    fileName = `doc_${lastPart.substring(0, 8)}.pdf`;
                }
            } catch {
                // mantém o padrão
            }
        }

        // Garante a extensão pdf para o sistema
        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }

        return new File([blob], fileName, { type: 'application/pdf' });
    } catch (error) {
        console.error("Erro no download:", error);
        // Mensagem personalizada para links governamentais/restritos
        throw new Error(
            'Não foi possível baixar este link automaticamente devido às restrições de segurança do portal de origem (CORS). ' +
            'Por favor, baixe o arquivo manualmente no portal do Ifes e anexe o PDF aqui.'
        );
    }
}
