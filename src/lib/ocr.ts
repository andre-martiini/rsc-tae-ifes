import { createWorker } from 'tesseract.js';

/**
 * Realiza OCR em uma imagem (File ou Blob) e retorna o texto extraído.
 * Suporta português (por) e inglês (eng).
 */
export async function extractTextFromImage(file: Blob): Promise<string> {
    const worker = await createWorker('por+eng');

    try {
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();
        return text.trim();
    } catch (error) {
        console.error('Erro no OCR:', error);
        await worker.terminate();
        throw new Error('Não foi possível extrair texto desta imagem via OCR.');
    }
}
