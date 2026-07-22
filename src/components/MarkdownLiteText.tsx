import { Fragment } from 'react';
import { parseInlineMarkdown, dividirEmBlocosMarkdown } from '../lib/markdownLite';

/**
 * Renderiza em tela o mesmo subconjunto de Markdown que o PDF do Memorial
 * interpreta (negrito, itálico, cabeçalhos, listas) — ver src/lib/markdownLite.ts.
 * Usado na pré-visualização do Requerimento em Consolidation.tsx.
 */
export default function MarkdownLiteText({ text, className }: { text: string; className?: string }) {
  const blocos = dividirEmBlocosMarkdown(text);

  return (
    <div className={className}>
      {blocos.map((bloco, i) => {
        if (bloco.tipo === 'heading') {
          const headingClass = 'mb-2 mt-4 font-bold first:mt-0';
          switch (Math.min(bloco.nivel, 6)) {
            case 1: return <h1 key={i} className={headingClass}>{bloco.texto}</h1>;
            case 2: return <h2 key={i} className={headingClass}>{bloco.texto}</h2>;
            case 3: return <h3 key={i} className={headingClass}>{bloco.texto}</h3>;
            case 4: return <h4 key={i} className={headingClass}>{bloco.texto}</h4>;
            case 5: return <h5 key={i} className={headingClass}>{bloco.texto}</h5>;
            default: return <h6 key={i} className={headingClass}>{bloco.texto}</h6>;
          }
        }

        if (bloco.tipo === 'lista') {
          const ListTag = bloco.ordenada ? 'ol' : 'ul';
          const listClass = bloco.ordenada ? 'mb-4 list-decimal space-y-1 pl-5' : 'mb-4 list-disc space-y-1 pl-5';
          return (
            <ListTag key={i} className={listClass}>
              {bloco.itens.map((item, j) => (
                <li key={j}>
                  {parseInlineMarkdown(item).map((run, k) => (
                    <Fragment key={k}>
                      {run.bold ? <strong>{run.text}</strong> : run.italic ? <em>{run.text}</em> : run.text}
                    </Fragment>
                  ))}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={i} className="mb-4 last:mb-0">
            {parseInlineMarkdown(bloco.texto).map((run, k) => (
              <Fragment key={k}>
                {run.bold ? <strong>{run.text}</strong> : run.italic ? <em>{run.text}</em> : run.text}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
