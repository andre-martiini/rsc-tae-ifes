import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Pilcrow } from 'lucide-react';
import { cn } from '../lib/utils';
import { markdownLiteToTiptapDoc, tiptapDocToMarkdownLite } from '../lib/markdownLiteTiptap';

/**
 * Editor visual (WYSIWYG) do Memorial: o usuário vê o texto já formatado e usa a
 * barra de ferramentas em vez de digitar sintaxe Markdown. Internamente converte
 * de/para o mesmo Markdown-lite que o PDF e a pré-visualização interpretam
 * (ver markdownLiteTiptap.ts), então nada muda do lado da geração/exportação.
 */
export default function MemorialEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const lastEmitted = useRef(value);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } })],
    content: markdownLiteToTiptapDoc(value),
    editorProps: {
      attributes: {
        class: 'memorial-editor-prose min-h-[280px] px-4 py-4 text-sm leading-7 text-gray-800 outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = tiptapDocToMarkdownLite(editor.getJSON());
      lastEmitted.current = markdown;
      onChange(markdown);
    },
  });

  // Mantém o editor em sincronia se o texto mudar por fora (ex.: geração via IA).
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(markdownLiteToTiptapDoc(value) as JSONContent);
  }, [editor, value]);

  if (!editor) return null;

  const toolbarButtons = [
    {
      label: 'Negrito',
      icon: Bold,
      active: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Itálico',
      icon: Italic,
      active: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Título',
      icon: Heading1,
      active: editor.isActive('heading', { level: 1 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: 'Subtítulo',
      icon: Heading2,
      active: editor.isActive('heading', { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Texto normal',
      icon: Pilcrow,
      active: editor.isActive('paragraph'),
      onClick: () => editor.chain().focus().setParagraph().run(),
    },
    {
      label: 'Lista com marcadores',
      icon: List,
      active: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Lista numerada',
      icon: ListOrdered,
      active: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  const isEmpty = editor.isEmpty;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-all focus-within:border-violet-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-100',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-white/70 px-2 py-1.5">
        {toolbarButtons.map(({ label, icon: Icon, active, onClick }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-violet-50 hover:text-violet-700',
              active && 'bg-violet-100 text-violet-700',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <p className="pointer-events-none absolute left-4 top-4 text-sm leading-7 text-gray-400">{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
