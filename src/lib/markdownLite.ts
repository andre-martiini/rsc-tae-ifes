/**
 * Subconjunto simples de Markdown usado em textos livres do usuário (ex.: Memorial):
 * negrito com asteriscos duplos, itálico com asterisco ou underline simples,
 * cabeçalhos (#, ##...) e listas (-, *). Compartilhado entre a geração do PDF
 * (pdfGenerator.ts) e a pré-visualização em tela (Consolidation.tsx) para que
 * as duas superfícies interpretem exatamente o mesmo texto da mesma forma.
 */

export type InlineRun = { text: string; bold: boolean; italic: boolean };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^([-*+•◦▪▫‣⁃]|\d+(?:\.\d+)*[\.\)])\s+/;
const ORDERED_RE = /^\d+(?:\.\d+)*[\.\)]\s+/;

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

/**
 * Item de lista com o marcador original preservado ("1.", "2.1.", "3)", "-", "•"...).
 * Em listas ordenadas o marcador escrito pelo autor é reaproveitado na renderização,
 * em vez de renumerar do 1 — texto gerado por IA costuma numerar seções ("1.", "2.",
 * "2.1.") em blocos separados por linha em branco, e renumerar quebrava a sequência.
 */
export type ItemLista = { texto: string; marcador: string };

export type BlocoMarkdown =
  | { tipo: 'heading'; nivel: number; texto: string }
  | { tipo: 'lista'; ordenada?: boolean; itens: ItemLista[] }
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
      const ordenada = linhas.every((linha) => ORDERED_RE.test(linha));
      resultado.push({
        tipo: 'lista',
        ordenada,
        itens: linhas.map((l) => {
          const m = l.match(BULLET_RE)!;
          return { marcador: m[1], texto: l.slice(m[0].length) };
        }),
      });
      continue;
    }

    resultado.push({ tipo: 'paragrafo', texto: linhas.join(' ') });
  }

  return mesclarListasAdjacentes(resultado);
}

/**
 * Funde blocos de lista com marcadores (-, *, •...) consecutivos em um só. Texto gerado
 * por IA costuma separar cada item de lista por linha em branco (parágrafos distintos);
 * sem essa fusão, cada item vira uma lista de um único elemento.
 * Listas numeradas ficam de fora de propósito: números reaparecem como pseudo-cabeçalhos
 * de seção no texto da IA ("1. APRESENTAÇÃO...", "2. DESENVOLVIMENTO...", "2.1. ...") e
 * fundi-los quebraria essa numeração de seções (ver teste correspondente).
 */
function mesclarListasAdjacentes(blocos: BlocoMarkdown[]): BlocoMarkdown[] {
  const resultado: BlocoMarkdown[] = [];

  for (const bloco of blocos) {
    const anterior = resultado[resultado.length - 1];
    if (
      bloco.tipo === 'lista' &&
      !bloco.ordenada &&
      anterior?.tipo === 'lista' &&
      !anterior.ordenada
    ) {
      anterior.itens.push(...bloco.itens);
      continue;
    }
    resultado.push(bloco);
  }

  return resultado;
}
