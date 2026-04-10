import { createWorker } from 'tesseract.js';

export interface OcrExtractionResult {
  text: string;
  confidence: number;
}

/**
 * Realiza OCR em uma imagem (Blob, File ou Canvas) e retorna texto + confianca.
 * Suporta portugues (por) e ingles (eng).
 */
export async function extractTextFromImageDetailed(
  file: Blob | HTMLCanvasElement,
): Promise<OcrExtractionResult> {
  const worker = await createWorker('por+eng');

  try {
    const { data } = await worker.recognize(file);
    await worker.terminate();

    return {
      text: data.text.trim(),
      confidence: data.confidence ?? 0,
    };
  } catch (error) {
    console.error('Erro no OCR:', error);
    await worker.terminate();
    throw new Error('Nao foi possivel extrair texto desta imagem via OCR.');
  }
}

export async function extractTextFromImage(file: Blob | HTMLCanvasElement): Promise<string> {
  const result = await extractTextFromImageDetailed(file);
  return result.text;
}
