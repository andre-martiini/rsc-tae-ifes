import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileText, Loader2, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';
import type { Documento } from '../data/mock';
import {
  getInstructionDocument,
  INSTRUCTION_DOCUMENT_SLOTS,
} from '../lib/instructionDocuments';
import { cn } from '../lib/utils';

function formatBytes(value?: number) {
  if (!value) return '';
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InstructionDocumentsPanel() {
  const { servidor, documentos, addDocumentoFromFile, deleteDocumento } = useAppContext();
  const [busyCategory, setBusyCategory] = useState<Documento['categoria_instrucao']>();
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const docsDoServidor = useMemo(
    () => documentos.filter((doc) => doc.servidor_id === servidor?.id),
    [documentos, servidor?.id],
  );

  if (!servidor) return null;

  const handleFile = async (
    categoria: NonNullable<Documento['categoria_instrucao']>,
    file?: File,
  ) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Anexe o documento em formato PDF.');
      return;
    }

    const current = getInstructionDocument(docsDoServidor, categoria);
    setBusyCategory(categoria);
    try {
      const { doc, exists, conflitoClassificacao } = await addDocumentoFromFile({
        servidorId: servidor.id,
        file,
        tipoDocumento: 'instrucao_processual',
        categoriaInstrucao: categoria,
      });

      if (conflitoClassificacao) {
        toast.error(
          `O arquivo "${doc.nome_arquivo}" já está no sistema como documento comprobatório vinculado a um lançamento — anexe aqui o extrato correto.`,
        );
        return;
      }

      if (current && current.id !== doc.id) {
        await deleteDocumento(current.id);
      }
      if (exists && current?.id !== doc.id) {
        toast.info('Este arquivo já estava no sistema — o documento existente foi reaproveitado como documento de instrução.');
      } else {
        toast.success(current ? 'Documento substituído.' : 'Documento de instrução anexado.');
      }
    } catch (error) {
      console.error('Erro ao anexar documento de instrução:', error);
      toast.error('Não foi possível salvar o PDF neste navegador.');
    } finally {
      setBusyCategory(undefined);
      const input = inputRefs.current[categoria];
      if (input) input.value = '';
    }
  };

  const handleRemove = async (doc: Documento) => {
    setBusyCategory(doc.categoria_instrucao);
    try {
      await deleteDocumento(doc.id);
      toast.success('Documento removido.');
    } catch {
      toast.error('Não foi possível remover o documento.');
    } finally {
      setBusyCategory(undefined);
    }
  };

  return (
    <section id="instruction-documents-section" className="mb-6 print:hidden">
      <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-sky-50 p-2.5 text-sky-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
              Documentos para instrução do processo
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-500">
              Anexe o documento de escolaridade que fundamenta o pedido e solicite os três extratos ao
              setor de Gestão de Pessoas do seu campus. Todos serão reunidos automaticamente no pacote final.
              Não é necessário anexar aqui todos os certificados da sua trajetória: use apenas o documento
              oficial que comprova o requisito de escolaridade. Se uma titulação formal superior for usada para
              pontuar no Requisito VI, ela não pode ser a mesma já utilizada no IQ atual e deve continuar vinculada
              ao respectivo lançamento. A aceitação de formação obtida antes do ingresso deve seguir a orientação
              institucional vigente.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {INSTRUCTION_DOCUMENT_SLOTS.map((slot) => {
            const doc = getInstructionDocument(docsDoServidor, slot.categoria);
            const busy = busyCategory === slot.categoria;

            return (
              <article
                key={slot.categoria}
                className={cn(
                  'rounded-xl border p-4 transition-colors',
                  doc ? 'border-emerald-100 bg-emerald-50/35' : 'border-gray-200 bg-gray-50/50',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('mt-0.5 rounded-lg p-2', doc ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-400')}>
                    {doc ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black text-gray-900">{slot.titulo}</h4>
                      {slot.codigo && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-700">
                          {slot.codigo}
                        </span>
                      )}
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider',
                        slot.obrigatorio ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600',
                      )}>
                        {slot.obrigatorio ? 'Obrigatório' : 'Opcional'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{slot.descricao}</p>

                    {doc && (
                      <div className="mt-3 rounded-lg border border-emerald-100 bg-white px-3 py-2">
                        <p className="truncate text-xs font-bold text-gray-800" title={doc.nome_arquivo}>{doc.nome_arquivo}</p>
                        <p className="mt-0.5 text-[10px] text-gray-400">{formatBytes(doc.tamanho_bytes)}</p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        ref={(element) => { inputRefs.current[slot.categoria] = element; }}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(event) => void handleFile(slot.categoria, event.target.files?.[0])}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => inputRefs.current[slot.categoria]?.click()}
                        className="inline-flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-gray-700 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="mr-1.5 h-3.5 w-3.5" />}
                        {doc ? 'Substituir PDF' : 'Anexar PDF'}
                      </button>
                      {doc && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleRemove(doc)}
                          className="inline-flex h-8 items-center rounded-lg border border-red-100 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
