import * as pdfjs from 'pdfjs-dist';

// Configuração do worker de forma compatível com Vite
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (typeof window !== 'undefined' && 'GlobalWorkerOptions' in pdfjs) {
    (pdfjs as any).GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

/**
 * Extrai o texto de TODAS as páginas de um arquivo PDF.
 * Aceita File ou Blob.
 */
export async function extractTextFromPdf(input: File | Blob): Promise<string> {
    const arrayBuffer = await input.arrayBuffer();
    // Copia os bytes para um novo ArrayBuffer para evitar problemas de detached buffer
    const data = new Uint8Array(arrayBuffer);

    const loadingTask = pdfjs.getDocument({
        data,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
    });

    try {
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        console.log(`[pdfTranscription] PDF carregado com ${totalPages} página(s).`);

        const pageTexts: string[] = [];

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Reconstruir o texto preservando quebras de linha
            let lastY: number | null = null;
            const lines: string[] = [];

            for (const item of textContent.items) {
                const textItem = item as any;
                if (typeof textItem.str !== 'string') continue;

                // Detectar mudança de linha pela posição Y
                const currentY = textItem.transform?.[5];
                if (lastY !== null && currentY !== undefined && Math.abs(currentY - lastY) > 2) {
                    lines.push('\n');
                }
                lines.push(textItem.str);
                if (currentY !== undefined) {
                    lastY = currentY;
                }
            }

            const pageText = lines.join('').trim();
            console.log(`[pdfTranscription] Página ${i}/${totalPages}: ${pageText.length} caracteres extraídos.`);
            pageTexts.push(`--- PÁGINA ${i} de ${totalPages} ---\n${pageText}`);
        }

        const fullText = pageTexts.join('\n\n');

        if (!fullText.trim()) {
            console.warn('[pdfTranscription] Nenhum texto extraído. O PDF pode ser um documento escaneado (imagem).');
        }

        return fullText.trim();
    } catch (error) {
        console.error('[pdfTranscription] Erro ao transcrever PDF:', error);
        throw new Error('Não foi possível extrair o texto deste PDF.');
    }
}
