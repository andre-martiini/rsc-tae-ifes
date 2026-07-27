/**
 * Ponte entre o Markdown-lite compartilhado (ver markdownLite.ts) e o documento
 * ProseMirror/Tiptap usado pelo editor visual do Memorial. Garante que o texto
 * editado no editor WYSIWYG salve exatamente na mesma sintaxe que o PDF e a
 * pré-visualização em tela já interpretam.
 */
import type { JSONContent } from '@tiptap/react';
import { dividirEmBlocosMarkdown, parseInlineMarkdown } from './markdownLite';

function inlineTextToTiptapNodes(texto: string): JSONContent[] {
  const runs = parseInlineMarkdown(texto);
  if (runs.length === 0) return [];
  return runs
    .filter((run) => run.text.length > 0)
    .map((run) => {
      const marks: { type: string }[] = [];
      if (run.bold) marks.push({ type: 'bold' });
      if (run.italic) marks.push({ type: 'italic' });
      return marks.length > 0
        ? { type: 'text', text: run.text, marks }
        : { type: 'text', text: run.text };
    });
}

/** Converte o Markdown-lite salvo (memorial_texto) no documento inicial do editor Tiptap. */
export function markdownLiteToTiptapDoc(texto: string): JSONContent {
  const blocos = dividirEmBlocosMarkdown(texto);

  if (blocos.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  const content: JSONContent[] = blocos.map((bloco) => {
    if (bloco.tipo === 'heading') {
      return {
        type: 'heading',
        attrs: { level: Math.min(Math.max(bloco.nivel, 1), 6) },
        content: inlineTextToTiptapNodes(bloco.texto),
      };
    }

    if (bloco.tipo === 'lista') {
      return {
        type: bloco.ordenada ? 'orderedList' : 'bulletList',
        content: bloco.itens.map((item) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: inlineTextToTiptapNodes(item.texto) }],
        })),
      };
    }

    const paragraphContent = inlineTextToTiptapNodes(bloco.texto);
    return paragraphContent.length > 0
      ? { type: 'paragraph', content: paragraphContent }
      : { type: 'paragraph' };
  });

  return { type: 'doc', content };
}

function inlineNodesToMarkdown(nodes: JSONContent[] | undefined): string {
  if (!nodes) return '';
  return nodes
    .map((node) => {
      if (node.type !== 'text') return '';
      const text = node.text ?? '';
      const isBold = node.marks?.some((mark) => mark.type === 'bold');
      const isItalic = node.marks?.some((mark) => mark.type === 'italic');
      if (isBold && isItalic) return `***${text}***`;
      if (isBold) return `**${text}**`;
      if (isItalic) return `*${text}*`;
      return text;
    })
    .join('');
}

/** Serializa o documento do editor Tiptap de volta para o Markdown-lite compartilhado. */
export function tiptapDocToMarkdownLite(doc: JSONContent): string {
  const blocos = doc.content ?? [];
  const paragrafos: string[] = [];

  for (const bloco of blocos) {
    if (bloco.type === 'heading') {
      const nivel = typeof bloco.attrs?.level === 'number' ? bloco.attrs.level : 1;
      const texto = inlineNodesToMarkdown(bloco.content);
      if (texto.trim().length > 0) {
        paragrafos.push(`${'#'.repeat(nivel)} ${texto}`);
      }
      continue;
    }

    if (bloco.type === 'bulletList' || bloco.type === 'orderedList') {
      const ordenada = bloco.type === 'orderedList';
      const itens = (bloco.content ?? []).map((item, index) => {
        const itemParagraphs = (item.content ?? []).filter((n) => n.type === 'paragraph');
        const texto = itemParagraphs.map((p) => inlineNodesToMarkdown(p.content)).join(' ');
        const marcador = ordenada ? `${index + 1}.` : '-';
        return `${marcador} ${texto}`;
      });
      if (itens.some((linha) => linha.trim().length > 0)) {
        paragrafos.push(itens.join('\n'));
      }
      continue;
    }

    if (bloco.type === 'paragraph') {
      const texto = inlineNodesToMarkdown(bloco.content);
      if (texto.trim().length > 0) {
        paragrafos.push(texto);
      }
    }
  }

  return paragrafos.join('\n\n');
}
