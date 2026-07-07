import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clipboard, Download, ExternalLink, FileText, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import { estimatePromptTokens, gerarPromptAuditoriaConsolidada } from '../lib/auditPrompt';
import { getLancamentoDocumentIds } from '../lib/documentOrdering';
import { getDocumentBlob } from '../lib/documentStorage';
import { analyzePdfTranscription } from '../lib/pdfTranscription';
import { extractTextFromImage } from '../lib/ocr';
import { Button } from './ui/button';

type NivelResumo = {
  id?: string;
  label?: string;
  equivalencia?: string;
  pontosMinimos?: number;
  itensMinimos?: number;
} | null;

type Props = {
  open: boolean;
  onClose: () => void;
  servidor: Servidor;
  nivelPleiteado: NivelResumo;
  processo: ProcessoRSC;
  lancamentos: Lancamento[];
  itensRSC: ItemRSC[];
  documentos: Documento[];
  updateDocumento: (docId: string, updates: Partial<Documento>) => void;
};

type PrepStatus = {
  total: number;
  current: number;
  currentName?: string;
  failures: string[];
};

function needsTranscription(doc: Documento) {
  if (doc.transcricao?.trim()) return false;
  if (doc.gedoc_links?.length && !doc.caminho_storage) return false;
  return !!doc.caminho_storage;
}

async function transcribeDocument(doc: Documento) {
  const blob = await getDocumentBlob(doc.id);
  if (!blob) throw new Error('Arquivo local nao encontrado.');

  const fileName = doc.nome_arquivo.toLowerCase();
  const isPdf = blob.type === 'application/pdf' || fileName.endsWith('.pdf');
  const isImage = /^image\//i.test(blob.type) || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
  const isText = blob.type.startsWith('text/') || /\.(txt|md|json)$/i.test(fileName);

  if (isPdf) {
    const result = await analyzePdfTranscription(new File([blob], doc.nome_arquivo, { type: 'application/pdf' }));
    return result.text;
  }

  if (isImage) return extractTextFromImage(blob);
  if (isText) return blob.text();
  throw new Error('Formato sem transcricao automatica disponivel.');
}

function downloadTextFile(prompt: string, servidor: Servidor) {
  const siape = servidor.siape.replace(/\D/g, '') || 'servidor';
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `prompt-auditoria-rsc-${siape}-${date}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function AuditPromptModal({
  open,
  onClose,
  servidor,
  nivelPleiteado,
  processo,
  lancamentos,
  itensRSC,
  documentos,
  updateDocumento,
}: Props) {
  const [preparedDocs, setPreparedDocs] = useState<Documento[]>(documentos);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [status, setStatus] = useState<PrepStatus>({ total: 0, current: 0, failures: [] });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const usedDocumentIds = useMemo(
    () => new Set(lancamentos.flatMap(getLancamentoDocumentIds)),
    [lancamentos],
  );

  const promptTokens = estimatePromptTokens(prompt);
  const promptChars = prompt.length;

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function prepare() {
      setIsPreparing(true);
      setCopied(false);
      setPrompt('');

      const docsById = new Map(documentos.map((doc) => [doc.id, doc]));
      const docsToPrepare = documentos.filter((doc) => usedDocumentIds.has(doc.id) && needsTranscription(doc));
      const failures: string[] = [];
      setStatus({ total: docsToPrepare.length, current: 0, failures: [] });

      for (let index = 0; index < docsToPrepare.length; index += 1) {
        const doc = docsToPrepare[index];
        if (cancelled) return;
        setStatus({ total: docsToPrepare.length, current: index + 1, currentName: doc.nome_arquivo, failures });

        try {
          const text = await transcribeDocument(doc);
          const nextDoc = { ...doc, transcricao: text };
          docsById.set(doc.id, nextDoc);
          updateDocumento(doc.id, { transcricao: text });
        } catch (error) {
          console.error('Erro ao transcrever documento para auditoria:', error);
          failures.push(`${doc.nome_arquivo}: ${error instanceof Error ? error.message : 'falha desconhecida'}`);
        }
      }

      if (cancelled) return;

      const nextDocs = documentos.map((doc) => docsById.get(doc.id) ?? doc);
      const nextPrompt = gerarPromptAuditoriaConsolidada({
        servidor,
        nivelPleiteado,
        processo,
        lancamentos,
        itensRSC,
        documentos: nextDocs,
      });

      setPreparedDocs(nextDocs);
      setPrompt(nextPrompt);
      setStatus({ total: docsToPrepare.length, current: docsToPrepare.length, failures });
      setIsPreparing(false);
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const missingTextCount = useMemo(
    () =>
      preparedDocs.filter(
        (doc) => usedDocumentIds.has(doc.id) && !doc.transcricao?.trim() && !doc.gedoc_links?.length,
      ).length,
    [preparedDocs, usedDocumentIds],
  );

  const handleCopy = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      textareaRef.current?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    toast.success('Prompt copiado.');
    window.setTimeout(() => setCopied(false), 2500);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-prompt-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <FileText className="h-5 w-5" />
            </div>
            <h2 id="audit-prompt-title" className="text-lg font-black tracking-tight text-gray-900">
              {'Auditoria sem\u00e2ntica via IA'}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">
              {'O sistema prepara as transcri\u00e7\u00f5es dispon\u00edveis e gera um prompt consolidado para revisar conflitos, duplicidades e inconsist\u00eancias antes da exporta\u00e7\u00e3o final. Ao final, a IA monta um plano de a\u00e7\u00e3o passo a passo indicando o que corrigir na sua documenta\u00e7\u00e3o.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {'Privacidade/LGPD: o prompt cont\u00e9m dados pessoais e conte\u00fado dos comprovantes. Use uma IA adequada ao contexto institucional e, quando poss\u00edvel, desative hist\u00f3rico ou treinamento da conversa.'}
              </p>
            </div>
          </div>

          <div className="mb-4 grid gap-3 text-xs sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="font-bold uppercase tracking-wider text-gray-400">Servidor</p>
              <p className="mt-1 font-semibold text-gray-800">{servidor.nome_completo}</p>
              <p className="text-gray-500">SIAPE {servidor.siape}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="font-bold uppercase tracking-wider text-gray-400">Prompt</p>
              <p className="mt-1 font-semibold text-gray-800">{promptChars.toLocaleString('pt-BR')} caracteres</p>
              <p className="text-gray-500">~{promptTokens.toLocaleString('pt-BR')} tokens</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="font-bold uppercase tracking-wider text-gray-400">Preparacao</p>
              <p className="mt-1 font-semibold text-gray-800">
                {isPreparing ? `${status.current}/${status.total} documento(s)` : 'Concluida'}
              </p>
              <p className="truncate text-gray-500">{status.currentName ?? `${missingTextCount} sem texto local`}</p>
            </div>
          </div>

          {promptTokens > 30000 && (
            <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-900">
              {'Prompt extenso. Para melhor resultado, prefira modelos com contexto longo e use o bot\u00e3o de baixar TXT se a c\u00f3pia direta ficar pesada.'}
            </div>
          )}

          {status.failures.length > 0 && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-bold">{'Alguns documentos n\u00e3o puderam ser transcritos automaticamente:'}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {status.failures.map((failure) => (
                  <li key={failure}>{failure}</li>
                ))}
              </ul>
            </div>
          )}

          <textarea
            ref={textareaRef}
            readOnly
            value={isPreparing ? 'Preparando documentos e gerando prompt...' : prompt}
            className="h-[42vh] min-h-[320px] w-full resize-none rounded-xl border border-gray-200 bg-gray-950 p-4 font-mono text-xs leading-relaxed text-gray-100 shadow-inner focus:outline-none focus:ring-4 focus:ring-primary/10"
            onClick={(event) => event.currentTarget.select()}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap gap-2 text-xs">
            <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://gemini.google.com" target="_blank" rel="noreferrer">
              Gemini <ExternalLink className="h-3 w-3" />
            </a>
            <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://claude.ai" target="_blank" rel="noreferrer">
              Claude <ExternalLink className="h-3 w-3" />
            </a>
            <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://chat.openai.com" target="_blank" rel="noreferrer">
              ChatGPT <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadTextFile(prompt, servidor)}
              disabled={isPreparing || !prompt}
              className="h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest"
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar TXT
            </Button>
            <Button
              type="button"
              onClick={handleCopy}
              disabled={isPreparing || !prompt}
              className="h-10 rounded-xl bg-violet-700 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-violet-800"
            >
              {copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar Prompt'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
