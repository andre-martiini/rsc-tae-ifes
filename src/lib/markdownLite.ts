/**
 * Subconjunto simples de Markdown usado em textos livres do usuário (ex.: Memorial):
 * negrito com asteriscos duplos, itálico com asterisco ou underline simples,
 * cabeçalhos (#, ##...) e listas (-, *). Compartilhado entre a geração do PDF
 * (pdfGenerator.ts) e a pré-visualização em tela (Consolidation.tsx) para que
 * as duas superfícies interpretem exatamente o mesmo texto da mesma forma.
 */

export type InlineRun = { text: string; bold: boolean; italic: boolean };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^[-*]\s+/;

/**
 * Extrai negrito/itálico inline. Marcadores sem par de fechamento ficam como
 * texto comum (a regex exige abertura e fechamento na mesma string).
 */
export function parseInlineMarkdown(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, match.index), bold: false, italic: false });
    }
    if (match[1] !== undefined) {
      runs.push({ text: match[1], bold: true, italic: false });
    } else {
      runs.push({ text: (match[2] ?? match[3])!, bold: false, italic: true });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex), bold: false, italic: false });
  }
  return runs;
}

export type BlocoMarkdown =
  | { tipo: 'heading'; nivel: number; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'paragrafo'; texto: string };

/**
 * Divide um texto (parágrafos separados por linha em branco) em blocos de
 * cabeçalho, lista ou parágrafo — mesma regra usada por generateMemorialDescritivo.
 */
export function dividirEmBlocosMarkdown(texto: string): BlocoMarkdown[] {
  const blocos = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const resultado: BlocoMarkdown[] = [];

  for (const bloco of blocos) {
    const linhas = bloco.split('\n').map((l) => l.trim()).filter(Boolean);
    const headingMatch = linhas.length === 1 ? linhas[0].match(HEADING_RE) : null;

    if (headingMatch) {
      resultado.push({ tipo: 'heading', nivel: headingMatch[1].length, texto: headingMatch[2] });
      continue;
    }

    const isLista = linhas.length > 0 && linhas.every((linha) => BULLET_RE.test(linha));
    if (isLista) {
      resultado.push({ tipo: 'lista', itens: linhas.map((l) => l.replace(BULLET_RE, '')) });
      continue;
    }

    resultado.push({ tipo: 'paragrafo', texto: bloco });
  }

  return resultado;
}
