import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  FileArchive,
  FileText,
  Filter,
  Link,
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
  Unlink,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '../components/MainLayout';
import { Input } from '../components/ui/input';
import { useAppContext } from '../context/AppContext';
import type { Documento, ItemRSC, Lancamento } from '../data/mock';
import { copyTextToClipboard } from '../lib/clipboard';
import {
  buildDossierDocumentOrder,
  compareDocumentsByDossierOrder,
  formatDossierDocumentLabel,
  getLancamentoDocumentIds,
  sortLancamentosByDossierOrder,
} from '../lib/documentOrdering';
import { getDocumentBlob } from '../lib/documentStorage';
import { prepareViewerBlob, shouldRenderAsPdf } from '../lib/documentViewer';
import { generateLLMPrompt } from '../lib/llmPrompt';
import { analyzePdfTranscription } from '../lib/pdfTranscription';
import { cn } from '../lib/utils';
import SingleAuditPromptModal from '../components/SingleAuditPromptModal';

type DocumentUsage = {
  lancamento: Lancamento;
  item?: ItemRSC;
};

type DocumentSource = 'upload' | 'reference' | 'converted' | 'merged' | 'metadata' | 'instruction';

type DocumentAlert = {
  key: string;
  label: string;
  tone: 'amber' | 'red' | 'sky';
};

type InventoryRow = {
  doc: Documento;
  usages: DocumentUsage[];
  source: DocumentSource;
  alerts: DocumentAlert[];
  itemCount: number;
  duplicateHashDocs: Documento[];
  duplicateLinkDocs: Documento[];
  dossierIndex?: number;
  dossierLabel?: string;
};

type StatusFilter =
  | 'todos'
  | 'alertas'
  | 'reutilizados'
  | 'sem_vinculo'
  | 'duplicados'
  | 'referencias'
  | 'uploads'
  | 'mesclados'
  | 'instrucao';

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'alertas', label: 'Com alertas' },
  { value: 'reutilizados', label: 'Reutilizados' },
  { value: 'sem_vinculo', label: 'Sem vínculo' },
  { value: 'duplicados', label: 'Duplicados' },
  { value: 'referencias', label: 'Referências' },
  { value: 'uploads', label: 'Uploads' },
  { value: 'mesclados', label: 'Mesclados' },
  { value: 'instrucao', label: 'Instrução processual' },
];

const sourceLabels: Record<DocumentSource, string> = {
  upload: 'Upload local',
  reference: 'Referência',
  converted: 'Convertido',
  merged: 'Mesclado',
  metadata: 'Metadado',
  instruction: 'Instrução processual',
};

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatBytes(value?: number) {
  if (!value) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUserFileKind(doc: Documento) {
  if ((doc.gedoc_links?.length ?? 0) > 0 && !doc.caminho_storage) return 'Referência institucional';
  const mime = doc.mime_type?.toLowerCase() ?? '';
  const fileName = doc.nome_arquivo.toLowerCase();
  if (doc.convertido_para_pdf) return 'PDF convertido';
  if (mime.includes('pdf') || fileName.endsWith('.pdf')) return 'PDF';
  if (mime.startsWith('image/')) return 'Imagem';
  if (mime.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'Documento de texto';
  if (mime.includes('spreadsheet') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return 'Planilha';
  if (mime.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) return 'Texto';
  return 'Arquivo';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDocumentSource(doc: Documento): DocumentSource {
  if (doc.categoria_instrucao) return 'instruction';
  if ((doc.arquivos_componentes?.length ?? 0) > 1) return 'merged';
  if (doc.convertido_para_pdf) return 'converted';
  if ((doc.gedoc_links?.length ?? 0) > 0 && !doc.caminho_storage) return 'reference';
  if (doc.caminho_storage) return 'upload';
  return 'metadata';
}

function getDocumentHashes(doc: Documento) {
  return Array.from(new Set([doc.hash_arquivo, ...(doc.hashes_componentes ?? [])].filter(Boolean))) as string[];
}

function buildHashIndex(docs: Documento[]) {
  const index = new Map<string, Documento[]>();
  docs.forEach((doc) => {
    getDocumentHashes(doc).forEach((hash) => {
      const current = index.get(hash) ?? [];
      current.push(doc);
      index.set(hash, current);
    });
  });
  return index;
}

function buildLinkIndex(docs: Documento[]) {
  const index = new Map<string, Documento[]>();
  docs.forEach((doc) => {
    doc.gedoc_links?.forEach((link) => {
      const key = link.trim().toLowerCase();
      if (!key) return;
      const current = index.get(key) ?? [];
      current.push(doc);
      index.set(key, current);
    });
  });
  return index;
}

function buildInventoryRows(params: {
  docs: Documento[];
  lancamentos: Lancamento[];
  itensRSC: ItemRSC[];
}): InventoryRow[] {
  const { docs, lancamentos, itensRSC } = params;
  const docsById = new Map(docs.map((doc) => [doc.id, doc]));
  const itemsById = new Map(itensRSC.map((item) => [item.id, item]));
  const hashIndex = buildHashIndex(docs);
  const linkIndex = buildLinkIndex(docs);
  const dossierOrder = buildDossierDocumentOrder({ lancamentos, itensRSC });
  const sortedLancamentos = sortLancamentosByDossierOrder(lancamentos, itensRSC);

  const usageMap = new Map<string, DocumentUsage[]>();
  sortedLancamentos.forEach((lancamento) => {
    const ids = lancamento.comprovantes_ids ?? (lancamento.documento_id ? [lancamento.documento_id] : []);
    for (const docId of ids) {
      if (!docsById.has(docId)) continue;
      const current = usageMap.get(docId) ?? [];
      current.push({ lancamento, item: itemsById.get(lancamento.item_rsc_id) });
      usageMap.set(docId, current);
    }
  });

  return docs
    .map((doc) => {
      const usages = usageMap.get(doc.id) ?? [];
      const dossierEntry = dossierOrder.get(doc.id);
      const itemCount = new Set(usages.map((usage) => usage.lancamento.item_rsc_id)).size;
      const duplicateHashDocs = getDocumentHashes(doc)
        .flatMap((hash) => hashIndex.get(hash) ?? [])
        .filter((candidate) => candidate.id !== doc.id);
      const duplicateLinkDocs = (doc.gedoc_links ?? [])
        .flatMap((link) => linkIndex.get(link.trim().toLowerCase()) ?? [])
        .filter((candidate) => candidate.id !== doc.id);

      const alerts: DocumentAlert[] = [];
      if (itemCount > 1) {
        alerts.push({
          key: 'reused-items',
          label: `Usado em ${itemCount} itens`,
          tone: 'amber',
        });
      } else if (usages.length > 1) {
        alerts.push({
          key: 'reused-launches',
          label: `Usado em ${usages.length} lançamentos`,
          tone: 'sky',
        });
      }

      if (duplicateHashDocs.length > 0) {
        alerts.push({
          key: 'duplicate-hash',
          label: 'Arquivo repetido',
          tone: 'red',
        });
      }

      if (duplicateLinkDocs.length > 0) {
        alerts.push({
          key: 'duplicate-link',
          label: 'Link repetido',
          tone: 'amber',
        });
      }

      return {
        doc,
        usages,
        source: getDocumentSource(doc),
        alerts,
        itemCount,
        duplicateHashDocs: Array.from(new Map(duplicateHashDocs.map((entry) => [entry.id, entry])).values()),
        duplicateLinkDocs: Array.from(new Map(duplicateLinkDocs.map((entry) => [entry.id, entry])).values()),
        dossierIndex: dossierEntry?.index,
        dossierLabel: dossierEntry
          ? formatDossierDocumentLabel(dossierEntry.index)
          : doc.categoria_instrucao
            ? 'Instrução processual'
            : undefined,
      };
    })
    .sort((a, b) => compareDocumentsByDossierOrder(a.doc, b.doc, dossierOrder));
}

function matchesFilter(row: InventoryRow, filter: StatusFilter) {
  if (filter === 'todos') return true;
  if (filter === 'alertas') return row.alerts.length > 0;
  if (filter === 'reutilizados') return row.itemCount > 1 || row.usages.length > 1;
  if (filter === 'sem_vinculo') return row.usages.length === 0 && !row.doc.categoria_instrucao;
  if (filter === 'duplicados') return row.duplicateHashDocs.length > 0 || row.duplicateLinkDocs.length > 0;
  if (filter === 'referencias') return (row.doc.gedoc_links?.length ?? 0) > 0;
  if (filter === 'uploads') return !!row.doc.caminho_storage;
  if (filter === 'mesclados') return (row.doc.arquivos_componentes?.length ?? 0) > 1;
  if (filter === 'instrucao') return !!row.doc.categoria_instrucao;
  return true;
}

function alertClass(tone: DocumentAlert['tone']) {
  if (tone === 'red') return 'border-red-200 bg-red-50 text-red-700';
  if (tone === 'sky') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export default function Documents() {
  const { servidor, itensRSC, documentos, lancamentos, updateLancamento, updateDocumento, deleteDocumento } = useAppContext();
  const navigate = useNavigate();
  const servidorId = servidor?.id ?? '';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const [viewerErrors, setViewerErrors] = useState<Record<string, string>>({});
  const [viewerLoadingDocId, setViewerLoadingDocId] = useState<string | null>(null);
  const [promptModalText, setPromptModalText] = useState<string | null>(null);
  const [activeAuditLancamento, setActiveAuditLancamento] = useState<Lancamento | null>(null);
  const [activeAuditItem, setActiveAuditItem] = useState<ItemRSC | null>(null);
  const [promptLoadingDocId, setPromptLoadingDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<InventoryRow | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<{ row: InventoryRow; usage: DocumentUsage } | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const blobUrlsRef = useRef<Record<string, string>>({});

  const docsDoServidor = useMemo(
    () => documentos.filter((doc) => doc.servidor_id === servidorId),
    [documentos, servidorId],
  );

  const lancamentosDoServidor = useMemo(
    () => lancamentos.filter((lancamento) => lancamento.servidor_id === servidorId),
    [lancamentos, servidorId],
  );

  const rows = useMemo(
    () =>
      buildInventoryRows({
        docs: docsDoServidor,
        lancamentos: lancamentosDoServidor,
        itensRSC,
      }),
    [docsDoServidor, itensRSC, lancamentosDoServidor],
  );

  const missingDocumentLaunches = useMemo(() => {
    const docIds = new Set(docsDoServidor.map((doc) => doc.id));
    return lancamentosDoServidor.filter((lancamento) => {
      const ids = lancamento.comprovantes_ids ?? (lancamento.documento_id ? [lancamento.documento_id] : []);
      return ids.length > 0 && ids.every((id) => !docIds.has(id));
    });
  }, [docsDoServidor, lancamentosDoServidor]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return rows.filter((row) => {
      if (!matchesFilter(row, statusFilter)) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        row.dossierLabel,
        row.doc.nome_arquivo,
        row.doc.hash_arquivo,
        row.doc.arquivo_origem_nome,
        row.doc.categoria_instrucao,
        row.doc.gedoc_links?.join(' '),
        row.doc.arquivos_componentes?.map((entry) => entry.nome_arquivo).join(' '),
        row.usages.map((usage) => usage.item?.descricao).join(' '),
        row.usages.map((usage) => usage.item?.inciso).join(' '),
        row.usages.map((usage) => usage.item?.numero).join(' '),
      ]
        .filter(Boolean)
        .join(' ');

      return normalizeSearch(searchable).includes(normalizedQuery);
    });
  }, [query, rows, statusFilter]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.doc.id === selectedDocId) ?? filteredRows[0] ?? null,
    [filteredRows, rows, selectedDocId],
  );

  const stats = useMemo(() => {
    const linked = rows.filter((row) => row.usages.length > 0).length;
    const orphan = rows.filter((row) => row.usages.length === 0 && !row.doc.categoria_instrucao).length;
    const reused = rows.filter((row) => row.itemCount > 1 || row.usages.length > 1).length;
    const references = rows.filter((row) => (row.doc.gedoc_links?.length ?? 0) > 0).length;
    const merged = rows.filter((row) => (row.doc.arquivos_componentes?.length ?? 0) > 1).length;
    const withAlerts = rows.filter((row) => row.alerts.length > 0).length + missingDocumentLaunches.length;
    return { linked, orphan, reused, references, merged, withAlerts };
  }, [missingDocumentLaunches.length, rows]);

  useEffect(() => {
    blobUrlsRef.current = blobUrls;
  }, [blobUrls]);

  useEffect(() => {
    return () => {
      Object.values<string>(blobUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (selectedDocId && !rows.some((row) => row.doc.id === selectedDocId)) {
      setSelectedDocId(null);
    }
  }, [rows, selectedDocId]);

  useEffect(() => {
    const doc = selectedRow?.doc;
    if (!doc?.caminho_storage || blobUrls[doc.id]) return;

    let cancelled = false;
    setViewerLoadingDocId(doc.id);
    setViewerErrors((current) => {
      const next = { ...current };
      delete next[doc.id];
      return next;
    });

    void getDocumentBlob(doc.id)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setViewerErrors((current) => ({
            ...current,
            [doc.id]: 'Arquivo local não encontrado neste navegador.',
          }));
          return;
        }
        setBlobUrls((current) => ({
          ...current,
          [doc.id]: URL.createObjectURL(prepareViewerBlob(doc, blob)),
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setViewerErrors((current) => ({
          ...current,
          [doc.id]: 'Não foi possível carregar a visualização do arquivo.',
        }));
      })
      .finally(() => {
        if (!cancelled) setViewerLoadingDocId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [blobUrls, selectedRow]);

  const prepareDocumentForPrompt = async (doc: Documento) => {
    if (doc.transcricao || !doc.caminho_storage) {
      return doc;
    }

    const blob = await getDocumentBlob(doc.id).catch(() => null);
    if (!blob) {
      return doc;
    }

    const isPdf = shouldRenderAsPdf(doc, blob);
    if (!isPdf) {
      return doc;
    }

    try {
      const pdfFile = new File([prepareViewerBlob(doc, blob)], doc.nome_arquivo, { type: 'application/pdf' });
      const transcription = (await analyzePdfTranscription(pdfFile)).text;
      if (!transcription) return doc;
      updateDocumento(doc.id, { transcricao: transcription });
      return { ...doc, transcricao: transcription };
    } catch {
      return doc;
    }
  };

  const generatePromptForRow = async (row: InventoryRow) => {
    const usage = row.usages.find((entry) => entry.item);
    if (!usage?.item) {
      toast.error('Este documento precisa estar vinculado a um item para gerar o prompt de IA.');
      return;
    }

    setPromptLoadingDocId(row.doc.id);
    try {
      const preparedDoc = await prepareDocumentForPrompt(row.doc);
      const prompt = generateLLMPrompt({
        item: usage.item,
        lancamento: usage.lancamento,
        documento: preparedDoc,
        servidor,
      });
      setPromptModalText(prompt);
      setActiveAuditLancamento(usage.lancamento);
      setActiveAuditItem(usage.item);
    } finally {
      setPromptLoadingDocId(null);
    }
  };

  const deleteUnlinkedDocument = async (row: InventoryRow) => {
    if (row.usages.length > 0) {
      toast.error('Apenas documentos sem vínculo podem ser apagados por aqui.');
      return;
    }

    setDeletingDocId(row.doc.id);
    try {
      const existingUrl = blobUrls[row.doc.id];
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl);
      }
      setBlobUrls((current) => {
        const next = { ...current };
        delete next[row.doc.id];
        return next;
      });
      setViewerErrors((current) => {
        const next = { ...current };
        delete next[row.doc.id];
        return next;
      });
      await deleteDocumento(row.doc.id);
      setSelectedDocId(null);
      setPendingDeleteRow(null);
      toast.success('Documento apagado.');
    } catch {
      toast.error('Não foi possível apagar o documento.');
    } finally {
      setDeletingDocId(null);
    }
  };

  const unlinkDocumentFromUsage = async (params: {
    row: InventoryRow;
    usage: DocumentUsage;
    deleteIfOrphan: boolean;
  }) => {
    const { row, usage, deleteIfOrphan } = params;
    const docId = row.doc.id;
    const currentIds = getLancamentoDocumentIds(usage.lancamento);
    const reviewAction = usage.item
      ? {
        label: 'Revisar item',
        onClick: () => navigate(`/itens?item=${usage.item!.id}`),
      }
      : undefined;

    if (!currentIds.includes(docId)) {
      toast.error('Este vínculo já não existe mais no lançamento.');
      setPendingUnlink(null);
      return;
    }

    const nextIds = currentIds.filter((id) => id !== docId);
    setUnlinking(true);
    try {
      const updated = updateLancamento(usage.lancamento.id, {
        comprovantes_ids: nextIds,
        documento_id: nextIds[0],
      });

      if (!updated) {
        toast.error('Não foi possível atualizar o item vinculado.');
        return;
      }

      const stillUsedElsewhere = lancamentosDoServidor.some((entry) =>
        entry.id !== usage.lancamento.id && getLancamentoDocumentIds(entry).includes(docId),
      );

      if (deleteIfOrphan && !stillUsedElsewhere) {
        const existingUrl = blobUrls[docId];
        if (existingUrl) URL.revokeObjectURL(existingUrl);
        setBlobUrls((current) => {
          const next = { ...current };
          delete next[docId];
          return next;
        });
        setViewerErrors((current) => {
          const next = { ...current };
          delete next[docId];
          return next;
        });
        await deleteDocumento(docId);
        setSelectedDocId(null);
        toast.success('Documento desvinculado do item e apagado do inventário.', {
          description: 'Revise a quantidade, o período e a pontuação do item se necessário.',
          action: reviewAction,
          duration: 10000,
        });
      } else if (nextIds.length === 0) {
        toast.warning('Documento desvinculado. O lançamento ficou sem comprovante vinculado.', {
          description: 'Revise a quantidade, o período e a pontuação do item antes de consolidar.',
          action: reviewAction,
          duration: 12000,
        });
      } else {
        toast.success('Documento desvinculado do item.', {
          description: 'Revise a quantidade, o período e a pontuação do item se necessário.',
          action: reviewAction,
          duration: 10000,
        });
      }

      setPendingUnlink(null);
    } catch {
      toast.error('Não foi possível desvincular o documento.');
    } finally {
      setUnlinking(false);
    }
  };

  if (!servidor) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout activeView="documents">
      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Database className="h-3.5 w-3.5" />
                Inventário documental
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Documentos carregados</h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Visão completa dos arquivos, referências e vínculos usados no dossiê de {servidor.nome_completo}.
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar documento, item, inciso ou link..."
                  className="h-11 border-gray-200 pl-10"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Metric label="Total" value={rows.length} />
            <Metric label="Vinculados" value={stats.linked} tone="green" />
            <Metric label="Sem vínculo" value={stats.orphan} tone={stats.orphan ? 'amber' : 'gray'} />
            <Metric label="Reutilizados" value={stats.reused} tone={stats.reused ? 'amber' : 'gray'} />
            <Metric label="Referências" value={stats.references} tone="sky" />
            <Metric label="Alertas" value={stats.withAlerts} tone={stats.withAlerts ? 'red' : 'green'} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <Filter className="h-3.5 w-3.5" />
              Filtro
            </span>
            {statusFilters.map((filter) => {
              const active = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    active
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </section>

        {missingDocumentLaunches.length > 0 && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h2 className="text-sm font-black">Há lançamentos apontando para documentos ausentes</h2>
                <p className="mt-1 text-sm text-red-700">
                  {missingDocumentLaunches.length} lançamento(s) possuem identificador de documento, mas o registro não foi encontrado no inventário.
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="grid min-h-[560px] gap-5 xl:grid-cols-[minmax(430px,520px)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-3.5 py-2.5">
              <span className="text-[13px] font-bold text-gray-900">
                {filteredRows.length} documento(s)
              </span>
              {query || statusFilter !== 'todos' ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('todos');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-50"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </button>
              ) : null}
            </div>

            {filteredRows.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center">
                <FileText className="h-9 w-9 text-gray-300" />
                <div>
                  <h2 className="text-base font-bold text-gray-900">Nenhum documento encontrado</h2>
                  <p className="mt-1 text-sm text-gray-500">Ajuste os filtros ou registre um lançamento com documento.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full table-fixed text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left">
                      <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Documento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const selected = selectedRow?.doc.id === row.doc.id;
                      return (
                        <tr
                          key={row.doc.id}
                          className={cn(
                            'cursor-pointer border-b border-gray-100 transition-colors last:border-b-0',
                            selected ? 'bg-primary/5' : 'hover:bg-gray-50',
                          )}
                          onClick={() => setSelectedDocId(row.doc.id)}
                        >
                          <td className="px-3 py-2.5 align-top">
                            <div className="flex items-start gap-2.5">
                              <div className={cn(
                                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                                row.source === 'reference' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600',
                              )}>
                                {row.source === 'reference' ? <Link className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                {row.dossierLabel && (
                                  <span className="mb-1 inline-flex rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary">
                                    {row.dossierLabel}
                                  </span>
                                )}
                                <p className="break-words text-[12px] font-semibold leading-snug text-gray-900">{row.doc.nome_arquivo}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  {row.usages.length === 0 ? (
                                    <span
                                      title="Nenhum item vinculado"
                                      className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500"
                                    >
                                      0 vínculos
                                    </span>
                                  ) : (
                                    <>
                                      {row.usages.slice(0, 3).map((usage) => (
                                        <button
                                          key={usage.lancamento.id}
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            if (usage.item) navigate(`/itens?item=${usage.item.id}`);
                                          }}
                                          className="rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                        >
                                          {usage.item ? `Item ${usage.item.numero} · Inciso ${usage.item.inciso}` : 'Item não encontrado'}
                                        </button>
                                      ))}
                                      {row.usages.length > 3 && (
                                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
                                          +{row.usages.length - 3}
                                        </span>
                                      )}
                                    </>
                                  )}

                                  {row.alerts.length > 0 && (
                                    <span
                                      title={row.alerts.map((alert) => alert.label).join(' · ')}
                                      aria-label={row.alerts.map((alert) => alert.label).join('. ')}
                                      className={cn(
                                        'inline-flex h-5 w-5 items-center justify-center rounded-full border',
                                        row.alerts.some((alert) => alert.tone === 'red')
                                          ? 'border-red-200 bg-red-50 text-red-700'
                                          : 'border-amber-200 bg-amber-50 text-amber-700',
                                      )}
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
            {selectedRow ? (
              <DocumentDetail
                row={selectedRow}
                viewerUrl={blobUrls[selectedRow.doc.id]}
                viewerLoading={viewerLoadingDocId === selectedRow.doc.id}
                viewerError={viewerErrors[selectedRow.doc.id]}
                promptLoading={promptLoadingDocId === selectedRow.doc.id}
                deleting={deletingDocId === selectedRow.doc.id}
                onGeneratePrompt={() => void generatePromptForRow(selectedRow)}
                onDelete={() => setPendingDeleteRow(selectedRow)}
                onUnlinkUsage={(usage) => setPendingUnlink({ row: selectedRow, usage })}
                onNavigateToItem={(itemId) => navigate(`/itens?item=${itemId}`)}
              />
            ) : (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
                <FileText className="h-9 w-9 text-gray-300" />
                <div>
                  <h2 className="text-base font-bold text-gray-900">Selecione um documento</h2>
                  <p className="mt-1 text-sm text-gray-500">Os vínculos e detalhes aparecem aqui.</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
      {promptModalText && activeAuditLancamento && activeAuditItem && (
        <SingleAuditPromptModal
          open={!!promptModalText}
          onClose={() => {
            setPromptModalText(null);
            setActiveAuditLancamento(null);
            setActiveAuditItem(null);
          }}
          servidor={servidor}
          item={activeAuditItem}
          lancamento={activeAuditLancamento}
          prompt={promptModalText}
        />
      )}
      {pendingDeleteRow && (
        <DeleteDocumentModal
          row={pendingDeleteRow}
          deleting={deletingDocId === pendingDeleteRow.doc.id}
          onClose={() => setPendingDeleteRow(null)}
          onConfirm={() => void deleteUnlinkedDocument(pendingDeleteRow)}
        />
      )}
      {pendingUnlink && (
        <UnlinkDocumentModal
          row={pendingUnlink.row}
          usage={pendingUnlink.usage}
          unlinking={unlinking}
          remainingUsageCount={pendingUnlink.row.usages.filter((entry) => entry.lancamento.id !== pendingUnlink.usage.lancamento.id).length}
          remainingDocsInLaunch={getLancamentoDocumentIds(pendingUnlink.usage.lancamento).filter((id) => id !== pendingUnlink.row.doc.id).length}
          onClose={() => setPendingUnlink(null)}
          onUnlinkOnly={() => void unlinkDocumentFromUsage({ ...pendingUnlink, deleteIfOrphan: false })}
          onUnlinkAndDelete={() => void unlinkDocumentFromUsage({ ...pendingUnlink, deleteIfOrphan: true })}
        />
      )}
    </MainLayout>
  );
}

function Metric({
  label,
  value,
  tone = 'gray',
}: {
  label: string;
  value: number;
  tone?: 'gray' | 'green' | 'amber' | 'red' | 'sky';
}) {
  const toneClass = {
    gray: 'border-gray-200 bg-gray-50 text-gray-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    sky: 'border-sky-200 bg-sky-50 text-sky-900',
  }[tone];

  return (
    <div className={cn('rounded-xl border p-3', toneClass)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function DocumentDetail({
  row,
  viewerUrl,
  viewerLoading,
  viewerError,
  promptLoading,
  deleting,
  onGeneratePrompt,
  onDelete,
  onUnlinkUsage,
  onNavigateToItem,
}: {
  row: InventoryRow;
  viewerUrl?: string;
  viewerLoading: boolean;
  viewerError?: string;
  promptLoading: boolean;
  deleting: boolean;
  onGeneratePrompt: () => void;
  onDelete: () => void;
  onUnlinkUsage: (usage: DocumentUsage) => void;
  onNavigateToItem: (itemId: string) => void;
}) {
  const { doc } = row;
  const hash = doc.hash_arquivo ?? getDocumentHashes(doc)[0];
  const componentCount = doc.arquivos_componentes?.length ?? 0;
  const [componentsOpen, setComponentsOpen] = useState(false);

  useEffect(() => {
    setComponentsOpen(false);
  }, [doc.id]);

  return (
    <div className="flex h-full min-h-[560px] flex-col">
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">Detalhe do documento</p>
            <h2 className="mt-1 break-words text-lg font-black leading-tight text-gray-900">{doc.nome_arquivo}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {row.usages.length === 0 && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                title="Apagar documento sem vínculo"
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {deleting ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Apagar
              </button>
            )}
            <button
              type="button"
              onClick={onGeneratePrompt}
              disabled={promptLoading || row.usages.length === 0}
              title={row.usages.length === 0 ? 'Vincule o documento a um item antes de gerar o prompt' : 'Gerar prompt para validação com IA'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {promptLoading ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              IA
            </button>
          </div>
        </div>

        {row.alerts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {row.alerts.map((alert) => (
              <span key={alert.key} className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', alertClass(alert.tone))}>
                {alert.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 border-b border-gray-100 p-4">
        <section className="space-y-2.5">
          <h3 className="text-xs font-black uppercase tracking-wide text-gray-400">Informações</h3>
          <dl className="grid grid-cols-1 gap-1.5 text-sm md:grid-cols-3">
            <DetailRow label="Ordem" value={row.dossierLabel ?? 'Sem vínculo'} />
            <DetailRow label="Origem" value={sourceLabels[row.source]} />
            <DetailRow label="Upload" value={formatDate(doc.data_upload)} />
            <DetailRow label="Tamanho" value={formatBytes(doc.tamanho_bytes)} />
            <DetailRow label="Formato" value={formatUserFileKind(doc)} />
            <DetailRow label="Arquivo local" value={doc.caminho_storage ? 'Disponível' : 'Não aplicável'} />
            <DetailRow label="Transcrição" value={doc.transcricao ? 'Disponível' : 'Ausente'} />
          </dl>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5">
            <div className="flex items-start gap-2">
              <p className="shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Vínculos</p>
              {row.usages.length === 0 ? (
                <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  0 vínculos
                </span>
              ) : (
                <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                  {row.usages.map((usage) => (
                    <span key={usage.lancamento.id} className="inline-flex overflow-hidden rounded-full border border-gray-200 bg-white">
                      <button
                        type="button"
                        onClick={() => usage.item && onNavigateToItem(usage.item.id)}
                        className="px-2 py-0.5 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                        title={usage.item?.descricao ?? usage.lancamento.item_rsc_id}
                      >
                        {usage.item ? `Item ${usage.item.numero} · Inciso ${usage.item.inciso}` : 'Item não encontrado'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUnlinkUsage(usage)}
                        className="inline-flex h-5 w-5 items-center justify-center border-l border-gray-200 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
                        title="Desvincular este documento do item"
                        aria-label="Desvincular este documento do item"
                      >
                        <Unlink className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {hash && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5">
              <div className="flex items-start gap-2">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Hash</p>
                <p className="min-w-0 flex-1 break-all font-mono text-[10px] leading-snug text-gray-600">{hash}</p>
              </div>
            </div>
          )}
        </section>

        {(doc.gedoc_links?.length ?? 0) > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wide text-gray-400">Links institucionais</h3>
            <ul className="space-y-2">
              {doc.gedoc_links!.map((link) => (
                <li key={link} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <a href={link} target="_blank" rel="noreferrer" className="break-all text-xs font-semibold text-emerald-800 hover:underline">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {componentCount > 1 && (
          <section className="rounded-lg border border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => setComponentsOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
              aria-expanded={componentsOpen}
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileArchive className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="text-[11px] font-black uppercase tracking-wide text-gray-500">
                  Componentes
                </span>
                <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  {componentCount}
                </span>
              </span>
              {componentsOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
              )}
            </button>

            {componentsOpen && (
              <div className="space-y-2 border-t border-gray-100 p-3">
                <ul className="space-y-2">
                  {doc.arquivos_componentes!.map((component, index) => {
                    const componentLink = doc.gedoc_links?.[index];
                    return (
                      <li key={`${component.nome_arquivo}-${component.hash_arquivo}`} className="rounded-lg border border-gray-100 bg-white p-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-xs font-semibold text-gray-800">{component.nome_arquivo}</p>
                            <p className="mt-1 break-all font-mono text-[9px] text-gray-400">{component.hash_arquivo}</p>
                          </div>
                          {componentLink ? (
                            <a
                              href={componentLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir componente"
                              aria-label={`Abrir componente ${component.nome_arquivo}`}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-white text-emerald-700 transition-colors hover:bg-emerald-50"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span
                              title="Este componente está incluído no PDF completo"
                              className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500"
                            >
                              No PDF
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[10px] leading-relaxed text-gray-500">
                  Componentes com link institucional podem ser abertos separadamente. Arquivos locais mesclados antes deste recurso ficam disponíveis dentro do PDF completo.
                </p>
              </div>
            )}
          </section>
        )}

        {(row.duplicateHashDocs.length > 0 || row.duplicateLinkDocs.length > 0) && (
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wide text-gray-400">Possíveis duplicidades</h3>
            {[...row.duplicateHashDocs, ...row.duplicateLinkDocs].map((duplicate) => (
              <div key={duplicate.id} className="rounded-xl border border-red-100 bg-red-50 p-3">
                <p className="break-words text-sm font-semibold text-red-900">{duplicate.nome_arquivo}</p>
                <p className="mt-1 text-[11px] text-red-700">{formatDate(duplicate.data_upload)}</p>
              </div>
            ))}
          </section>
        )}
      </div>

      <section className="flex min-h-[420px] flex-1 flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wide text-gray-400">Visualização</h3>
          {doc.caminho_storage && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
              Arquivo completo
            </span>
          )}
        </div>

        {viewerLoading ? (
          <div className="flex flex-1 min-h-[360px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm font-semibold text-gray-500">
            Carregando visualização...
          </div>
        ) : viewerUrl ? (
          <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <iframe src={viewerUrl} title={doc.nome_arquivo} className="h-[560px] w-full bg-white" />
          </div>
        ) : viewerError ? (
          <div className="flex flex-1 min-h-[360px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-800">
            {viewerError}
          </div>
        ) : (
          <div className="flex flex-1 min-h-[360px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            Este registro não possui arquivo local para visualização. Use os links institucionais, quando disponíveis.
          </div>
        )}
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="min-w-0 truncate text-right text-xs font-semibold text-gray-800">{value}</dd>
    </div>
  );
}

function PromptModal({ text, onClose }: { text: string; onClose: () => void }) {
  const copyPrompt = async () => {
    const copied = await copyTextToClipboard(text);
    if (!copied) {
      toast.error('Não foi possível copiar o prompt completo.');
      return;
    }
    toast.success(`Prompt copiado por completo (${text.length.toLocaleString('pt-BR')} caracteres).`);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex w-full max-w-3xl flex-col rounded-2xl border border-violet-100 bg-white shadow-2xl"
        style={{ maxHeight: '85vh' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-violet-50 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900">Prompt para validação com IA</h3>
              <p className="text-[11px] text-gray-500">{Math.round(text.length / 1024)}KB</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={copyPrompt}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Copiar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-600"
              aria-label="Fechar prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <textarea
            id="documents-prompt-textarea"
            readOnly
            value={text}
            className="h-full min-h-[50vh] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-[11px] leading-relaxed text-gray-700 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
            onFocus={(event) => {
              event.target.select();
              event.target.setSelectionRange(0, event.target.value.length);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function DeleteDocumentModal({
  row,
  deleting,
  onClose,
  onConfirm,
}: {
  row: InventoryRow;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={deleting ? undefined : onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>

          <h3 className="text-lg font-black tracking-tight text-gray-900">Apagar documento?</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Este documento não possui vínculos e será removido do inventário. Se houver arquivo local salvo no navegador, ele também será apagado.
          </p>

          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="break-words text-sm font-bold text-gray-900">{row.doc.nome_arquivo}</p>
            <p className="mt-1 text-[11px] text-gray-500">
              {formatUserFileKind(row.doc)} · {formatBytes(row.doc.tamanho_bytes)}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Apagar documento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnlinkDocumentModal({
  row,
  usage,
  unlinking,
  remainingUsageCount,
  remainingDocsInLaunch,
  onClose,
  onUnlinkOnly,
  onUnlinkAndDelete,
}: {
  row: InventoryRow;
  usage: DocumentUsage;
  unlinking: boolean;
  remainingUsageCount: number;
  remainingDocsInLaunch: number;
  onClose: () => void;
  onUnlinkOnly: () => void;
  onUnlinkAndDelete: () => void;
}) {
  const canDeleteAfterUnlink = remainingUsageCount === 0;
  const itemLabel = usage.item
    ? `Item ${usage.item.numero} · Inciso ${usage.item.inciso}`
    : 'Item não encontrado';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={unlinking ? undefined : onClose}>
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Unlink className="h-5 w-5" />
          </div>

          <h3 className="text-lg font-black tracking-tight text-gray-900">Desvincular documento do item?</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            O vínculo será removido do lançamento selecionado e a aba Itens será atualizada automaticamente.
            {remainingDocsInLaunch === 0 ? ' Este lançamento ficará sem comprovante vinculado.' : ''}
          </p>

          <div className="mt-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Documento</p>
              <p className="mt-1 break-words text-sm font-bold text-gray-900">{row.doc.nome_arquivo}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Vínculo</p>
              <p className="mt-1 text-sm font-semibold text-gray-700">{itemLabel}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {canDeleteAfterUnlink && (
              <button
                type="button"
                onClick={onUnlinkAndDelete}
                disabled={unlinking}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {unlinking && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Desvincular e apagar documento
              </button>
            )}
            <button
              type="button"
              onClick={onUnlinkOnly}
              disabled={unlinking}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Desvincular e manter no inventário
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={unlinking}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          {!canDeleteAfterUnlink && (
            <p className="mt-3 text-xs leading-relaxed text-amber-700">
              Este documento ainda é usado em outro vínculo, por isso ele será mantido no inventário.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
