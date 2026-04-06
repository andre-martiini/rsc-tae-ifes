import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { differenceInDays, format, isValid, parseISO } from 'date-fns';
import { PDFDocument } from 'pdf-lib';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  Link,
  Plus,
  ShieldAlert,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { institutionConfig, isValidInstitutionDocumentLink } from '../config/institution';
import type { Documento, ItemRSC } from '../data/mock';
import { useAppContext } from '../context/AppContext';
import { normalizeUploadToPdf, SUPPORTED_UPLOAD_ACCEPT } from '../lib/documentConversion';
import { getDocumentBlob } from '../lib/documentStorage';
import { calculateLancamentoPoints, formatPointValue, sumPointValues } from '../lib/points';
import { isItemJuridicallyFragile } from '../lib/rsc';
import { cn } from '../lib/utils';
import { downloadFileFromUrl } from '../lib/urlDownloader';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';


type UploadMeta = { converted: boolean; originalName: string; originalMimeType: string };

export default function ItemDetailPanel({ item, onSaved }: { item: ItemRSC; onSaved: () => void }) {
  const { addDocumentoFromFile, addDocumentoFromGedocLinks, addLancamento, removeLancamento, documentos, servidor, lancamentos, processo } = useAppContext();
  const [tab, setTab] = useState<'form' | 'history'>('form');
  const [docMode, setDocMode] = useState<'upload' | 'reference'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [referenceInput, setReferenceInput] = useState('');
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [ongoing, setOngoing] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmFragile, setConfirmFragile] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const [openDocs, setOpenDocs] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isSubmitted = processo.status === 'Em triagem';
  const isFragile = isItemJuridicallyFragile(item);
  const allowsDecimals = item.quantidade_automatica || /tempo|m.s|ano/i.test(item.unidade_medida);
  const showDateFields = item.modo_calculo !== 'manual';
  const effectiveEndDate = ongoing ? format(new Date(), 'yyyy-MM-dd') : dataFim;
  const quantidadeNumerica = Number.parseFloat(quantidade);
  const itemLancamentos = useMemo(() => lancamentos.filter((entry) => entry.servidor_id === servidor?.id && entry.item_rsc_id === item.id), [item.id, lancamentos, servidor?.id]);
  const itemPontos = useMemo(() => sumPointValues(itemLancamentos.map((entry) => entry.pontos_calculados)), [itemLancamentos]);
  const pointsPreview = Number.isFinite(quantidadeNumerica) && quantidadeNumerica > 0 ? calculateLancamentoPoints(quantidadeNumerica, item.pontos_por_unidade) : 0;
  const docsById = useMemo(() => new Map(documentos.map((doc) => [doc.id, doc])), [documentos]);

  useEffect(() => setConfirmFragile(!isFragile), [isFragile, item.id]);
  useEffect(() => () => Object.values<string>(blobUrls).forEach((url) => URL.revokeObjectURL(url)), [blobUrls]);

  const resetUpload = useCallback(() => {
    setFile(null);
    setUploadMeta(null);
    setUploadFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const resetForm = useCallback(() => {
    setDocMode('upload');
    setReferenceInput('');
    setReferenceLinks([]);
    setIsDownloading(false);
    setDataInicio('');
    setDataFim('');
    setOngoing(false);
    setQuantidade('');
    setConfirmFragile(!isFragile);
    setQuantidade('');
    setConfirmFragile(!isFragile);
    resetUpload();
  }, [isFragile, resetUpload]);

  useEffect(() => {
    setTab('form');
    setPendingDeleteId(null);
    resetForm();
  }, [item.id, resetForm]);

  const acceptPreparedFile = async (incoming: File | null) => {
    if (!incoming) return;
    try {
      const normalized = await normalizeUploadToPdf(incoming);
      if (normalized.file.size > 5 * 1024 * 1024) {
        setFile(null);
        setUploadMeta(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadFeedback('O arquivo preparado em PDF excede 5MB. Envie um documento menor.');
        return;
      }
      setFile(normalized.file);
      setUploadMeta({
        converted: normalized.converted,
        originalName: normalized.originalName,
        originalMimeType: normalized.originalMimeType,
      });
      setUploadFeedback(normalized.converted ? `Convertido para PDF: ${normalized.originalName}` : `PDF pronto: ${normalized.file.name}`);
    } catch (error) {
      setFile(null);
      setUploadMeta(null);
      setUploadFeedback(error instanceof Error ? error.message : 'Formato inválido.');
    }
  };

  const mergeAndAcceptFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (fileList.length === 1) return void acceptPreparedFile(fileList[0]);
    try {
      const normalized = await Promise.all(Array.from(fileList).map((candidate) => normalizeUploadToPdf(candidate)));
      const merged = await PDFDocument.create();
      for (const entry of normalized) {
        const src = await PDFDocument.load(await entry.file.arrayBuffer(), { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
      const mergedFile = new File([await merged.save() as unknown as BlobPart], `documentos-anexados-${fileList.length}.pdf`, { type: 'application/pdf' });
      if (mergedFile.size > 5 * 1024 * 1024) return void setUploadFeedback('O PDF consolidado excede 5MB.');
      setFile(mergedFile);
      setUploadMeta({ converted: true, originalName: `${fileList.length} arquivo(s) combinados`, originalMimeType: 'application/pdf' });
      setUploadFeedback(`${fileList.length} arquivo(s) consolidados em um único PDF.`);
    } catch {
      toast.error('Não foi possível preparar os arquivos selecionados.');
    }
  };

  const handleConsolidateLinks = async () => {
    if (referenceLinks.length === 0) return;

    try {
      setIsDownloading(true);
      setUploadFeedback(`Processando ${referenceLinks.length} link(s)...`);

      const downloadedFiles: File[] = [];
      let successCount = 0;

      for (const link of referenceLinks) {
        setUploadFeedback(`Baixando link ${successCount + 1}/${referenceLinks.length}...`);
        try {
          const file = await downloadFileFromUrl(link);
          downloadedFiles.push(file);
          successCount++;
        } catch (err) {
          console.error(`Falha ao baixar link: ${link}`, err);
          // We can choose to continue or abort. Let's show a toast.
          toast.error(`Falha ao baixar: ${link}`);
        }
      }

      if (downloadedFiles.length === 0) {
        throw new Error('Nenhum dos links pôde ser baixado.');
      }

      setUploadFeedback(`Mesclando ${downloadedFiles.length} documento(s)...`);

      const merged = await PDFDocument.create();
      for (const entry of downloadedFiles) {
        // Simple normalization if not PDF, but expected to be PDF
        const buff = await entry.arrayBuffer();
        const src = await PDFDocument.load(buff, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }

      const mergedPdfBytes = await merged.save();
      const mergedFile = new File(
        [mergedPdfBytes as unknown as BlobPart],
        `documentos-anexados-${downloadedFiles.length}.pdf`,
        { type: 'application/pdf' }
      );

      setFile(mergedFile);
      setUploadMeta({
        converted: true,
        originalName: `${downloadedFiles.length} link(s) consolidados`,
        originalMimeType: 'application/pdf',
      });

      setDocMode('upload'); // Switch to upload mode after consolidation
      toast.success('Links baixados e consolidados em um único PDF!');
      setUploadFeedback(null);
    } catch (error) {
      setUploadFeedback(null);
      const message = error instanceof Error ? error.message : 'Erro ao processar os links.';
      toast.error(`Falha ao converter links: ${message}. Verifique se as URLs estão corretas ou baixe os arquivos manualmente e anexe-os abaixo.`, { duration: 10000 });
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (docMode !== 'upload' || isSubmitted) return;
      const pasted = Array.from(event.clipboardData?.items ?? []).map((item) => item.getAsFile()).find((item): item is File => !!item);
      if (!pasted) return;
      event.preventDefault();
      void acceptPreparedFile(pasted);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [docMode, isSubmitted]);

  const addReference = () => {
    const trimmed = referenceInput.trim();
    if (!isValidInstitutionDocumentLink(trimmed)) return void toast.error(`URL inválida. Use um endereço HTTP(S), como: ${institutionConfig.documentLinks.inputPlaceholder}`);
    if (referenceLinks.includes(trimmed)) return void toast.error('Este link já foi adicionado.');
    setReferenceLinks((prev) => [...prev, trimmed]);
    setReferenceInput('');
  };

  const toggleViewer = async (doc: Documento) => {
    if (openDocs.has(doc.id)) {
      setOpenDocs((prev) => { const next = new Set(prev); next.delete(doc.id); return next; });
      return;
    }
    if (!blobUrls[doc.id]) {
      const blob = await getDocumentBlob(doc.id).catch(() => null);
      if (!blob) return void toast.error('Documento não encontrado no armazenamento local.');
      setBlobUrls((prev) => ({ ...prev, [doc.id]: URL.createObjectURL(blob) }));
    }
    setOpenDocs((prev) => new Set(prev).add(doc.id));
  };

  const calculateQuantityFromDates = () => {
    if (!dataInicio || !effectiveEndDate) return void toast.error('Preencha as datas antes de calcular.');
    const start = parseISO(dataInicio);
    const end = parseISO(effectiveEndDate);
    if (!isValid(start) || !isValid(end) || end < start) return void toast.error('Informe um período válido.');
    if (item.modo_calculo === 'auto_ano_fracao') {
      const totalMeses = (differenceInDays(end, start) + 1) / 30;
      if (totalMeses < 6) {
        setQuantidade('0');
        return void toast.warning('Período inferior a 6 meses — não computa unidade para este item.');
      }
      setQuantidade(String(Math.floor((totalMeses - 6) / 12) + 1));
    } else {
      setQuantidade(((differenceInDays(end, start) + 1) / 30).toFixed(2));
    }
  };

  const save = async () => {
    if (!servidor || saving) return;
    if (!quantidade.trim() || Number.isNaN(quantidadeNumerica) || quantidadeNumerica <= 0) return void toast.error('Informe uma quantidade maior que zero.');
    if (item.modo_calculo !== 'manual' && (!dataInicio || !effectiveEndDate)) return void toast.error('Este item exige datas de início e fim.');
    if (isFragile && !confirmFragile) return void toast.error('Confirme que revisou o enquadramento sensível deste item.');
    if (docMode === 'reference' && referenceLinks.length === 0) return void toast.error(`Adicione ao menos um ${institutionConfig.documentLinks.label}.`);
    if ((docMode === 'upload') && !file) return void toast.error('Anexe ou baixe um documento comprobatório.');
    try {
      setSaving(true);
      let documentoId: string | undefined = undefined;
      if (docMode === 'reference') {
        documentoId = (await addDocumentoFromGedocLinks({ servidorId: servidor.id, links: referenceLinks })).id;
      } else if (file) {
        documentoId = (await addDocumentoFromFile({
          servidorId: servidor.id,
          file,
          sourceName: uploadMeta?.originalName,
          sourceMimeType: uploadMeta?.originalMimeType,
          convertedToPdf: uploadMeta?.converted,
        })).id;
      }
      const pontosCalculados = calculateLancamentoPoints(quantidadeNumerica, item.pontos_por_unidade);
      addLancamento({
        servidor_id: servidor.id,
        item_rsc_id: item.id,
        documento_id: documentoId,
        data_inicio: showDateFields ? dataInicio : '',
        data_fim: showDateFields ? effectiveEndDate : '',
        quantidade_informada: quantidadeNumerica,
        declaracao_nao_duplicidade: true,
        declaracao_nao_ordinaria: true,
        pontos_calculados: pontosCalculados,
      });
      toast.success(`Lançamento salvo! +${formatPointValue(pontosCalculados)} pts.`);
      resetForm();
      setTab('history');
      onSaved();
    } catch (error) {
      // Surface duplicate-upload validation and other recoverable messages.
      const message =
        error instanceof Error ? error.message : 'Não foi possível salvar este lançamento.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const remove = (lancamentoId: string) => {
    if (pendingDeleteId !== lancamentoId) {
      setPendingDeleteId(lancamentoId);
      return void toast.warning('Clique novamente para confirmar a exclusão.');
    }
    if (!removeLancamento(lancamentoId)) return void toast.error('Não foi possível remover este lançamento.');
    setPendingDeleteId(null);
    toast.success('Lançamento removido.');
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {isFragile && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Enquadramento sensível</span>}
        </div>
        <h2 className="max-w-4xl text-lg font-bold leading-snug text-gray-900 lg:text-[1.55rem]">{item.descricao}</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-xs sm:text-sm">
          <div className="rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-gray-500"><strong className="text-gray-900">{formatPointValue(item.pontos_por_unidade)} pts</strong> por {item.unidade_medida}</div>
          <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700"><strong className="text-emerald-900">{formatPointValue(itemPontos)} pts</strong> já contabilizados neste item</div>
        </div>
      </div>

      <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab('form')} className={cn('rounded-full px-4 py-1.5 text-sm font-semibold', tab === 'form' ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-600')}>Formulário</button>
          <button type="button" onClick={() => setTab('history')} className={cn('rounded-full px-4 py-1.5 text-sm font-semibold', tab === 'history' ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-600')}>Lançamentos ({itemLancamentos.length})</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {tab === 'form' ? (
          <div className={cn('space-y-5', isSubmitted && 'pointer-events-none opacity-60')}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDocMode('upload')}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
                  docMode === 'upload'
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white text-gray-500',
                )}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Enviar arquivo
              </button>
              <button
                type="button"
                onClick={() => setDocMode('reference')}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
                  docMode === 'reference'
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white text-gray-500',
                )}
              >
                <Link className="h-3.5 w-3.5" />
                {institutionConfig.documentLinks.inputLabel}
              </button>
            </div>

            {/* ── Document + Fields side-by-side ── */}
            <section className="space-y-4">
              {docMode === 'reference' ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-3 text-xs text-gray-500">{institutionConfig.documentLinks.helperText}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input type="url" value={referenceInput} onChange={(e) => setReferenceInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addReference(); } }} placeholder={institutionConfig.documentLinks.inputPlaceholder} className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm" />
                    <button type="button" onClick={addReference} className="flex h-9 w-full items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary sm:w-9"><Plus className="h-4 w-4" /></button>
                  </div>
                  {referenceLinks.length > 0 && (
                    <>
                      <ul className="mt-3 space-y-1.5">{referenceLinks.map((link, index) => <li key={link} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="flex-1 truncate font-mono">{link}</span><button type="button" onClick={() => setReferenceLinks((prev) => prev.filter((_, i) => i !== index))}><X className="h-3.5 w-3.5" /></button></li>)}</ul>

                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          onClick={() => void handleConsolidateLinks()}
                          disabled={isDownloading}
                        >
                          {isDownloading ? (
                            <>Processando...</>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Adicionar Arquivos
                            </>
                          )}
                        </Button>
                        {uploadFeedback && <p className="mt-2 text-center text-[10px] text-gray-500">{uploadFeedback}</p>}
                      </div>
                    </>
                  )}
                </div>
                ) : (
                  <div>
                    <div className={`relative rounded-xl border p-4 transition-all ${file ? 'border-emerald-300 bg-emerald-50/60' : dragActive ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'}`} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragActive(false); }} onDrop={(e) => { e.preventDefault(); setDragActive(false); void mergeAndAcceptFiles(e.dataTransfer.files); }}>
                      <input ref={fileInputRef} type="file" multiple accept={SUPPORTED_UPLOAD_ACCEPT} onChange={(e) => void mergeAndAcceptFiles(e.target.files)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                      {file && <button type="button" onClick={(e) => { e.stopPropagation(); resetUpload(); }} className="absolute right-4 top-4 rounded-full border border-emerald-200 bg-white p-1.5 text-emerald-700"><Trash2 className="h-3.5 w-3.5" /></button>}
                      <p className="mb-3 pr-10 text-xs text-gray-500">
                        Clique, arraste ou cole um arquivo. Aceitamos PDF, JPG, PNG, TXT, MD ou JSON.
                      </p>
                      <div className={`flex min-h-9 items-center rounded-lg border border-dashed bg-white px-3 text-sm ${file ? 'border-emerald-300 text-emerald-800' : 'border-gray-200 text-gray-700'}`}>
                        <div className="mr-2 rounded-full bg-white/80 p-1"><UploadCloud className="h-4 w-4 text-gray-400" /></div>
                        <p className="flex-1 truncate" title={file?.name}>{file ? file.name : dragActive ? 'Solte os arquivos aqui' : 'Clique para selecionar um arquivo'}</p>
                        <p className="ml-3 shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-400">{file ? 'Pronto' : 'Anexar'}</p>
                      </div>
                    </div>
                    {uploadFeedback && <p className={`mt-2 text-xs ${file ? 'text-emerald-700' : 'text-gray-500'}`}>{uploadFeedback}</p>}
                  </div>
                )}
            </section>

            <section className="space-y-4">
              {showDateFields && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="data-inicio" className="text-xs">Data de início <span className="text-red-500">*</span></Label>
                    <Input id="data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-11 text-sm" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="data-fim" className="text-xs">Data de fim <span className="text-red-500">*</span></Label>
                    <Input id="data-fim" type="date" value={effectiveEndDate} onChange={(e) => setDataFim(e.target.value)} disabled={ongoing} className="h-11 text-sm" />
                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-500">
                      <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} className="h-3 w-3" />
                      Ainda em vigor
                    </label>
                  </div>
                </div>
              )}

              <div className={cn('grid gap-4', showDateFields ? 'md:grid-cols-12 md:items-start' : 'md:grid-cols-1')}>
                <div className={cn(showDateFields ? 'md:col-span-6' : 'md:col-span-1')}>
                  <div className="space-y-1.5">
                    <Label htmlFor="quantidade" className="text-xs">Quantidade</Label>
                    <div className="space-y-2">
                      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                        <Input
                          id="quantidade"
                          type="number"
                          min="0"
                          step={allowsDecimals ? '0.01' : '1'}
                          value={quantidade}
                          onChange={(e) => setQuantidade(e.target.value)}
                          className="h-12 w-full text-center text-2xl font-bold sm:w-[200px] sm:shrink-0"
                          placeholder="0"
                        />
                        {item.quantidade_automatica && (
                          <Button type="button" variant="outline" size="sm" onClick={calculateQuantityFromDates} className="h-12 rounded-md border-green-300 bg-green-50/60 px-3 text-green-700 hover:border-green-400 hover:bg-green-100/70 hover:text-green-800">
                            <Calculator className="mr-1.5 h-3.5 w-3.5" />Calcular
                          </Button>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-400">{item.unidade_medida}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {isFragile && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-semibold">Item com enquadramento sensível</p><label className="mt-2 flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={confirmFragile} onChange={(e) => setConfirmFragile(e.target.checked)} />Confirmo que revisei o enquadramento deste item.</label></div></div></div>}



            <div className="flex justify-end border-t border-gray-100 pt-4">
              <Button onClick={() => void save()} disabled={saving} className="bg-primary text-white hover:bg-primary/90">
                {saving ? 'Salvando...' : 'Salvar lançamento'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {itemLancamentos.length === 0 && <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Nenhum lançamento registrado para este item ainda.</div>}
            {itemLancamentos.map((lancamento) => {
              const doc = lancamento.documento_id ? docsById.get(lancamento.documento_id) : undefined;
              const isOpen = !!(doc && openDocs.has(doc.id));
              return (
                <div key={lancamento.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3"><div className="rounded-lg bg-green-50 p-2 text-green-700"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-sm font-bold text-gray-900">{lancamento.quantidade_informada} {item.unidade_medida || 'unidade(s)'}</p><p className="text-xs text-gray-500">{lancamento.data_inicio && lancamento.data_fim ? `${new Date(lancamento.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(lancamento.data_fim).toLocaleDateString('pt-BR')}` : 'Período não informado/exigido'}</p>{doc?.convertido_para_pdf && doc.arquivo_origem_nome && <p className="mt-1 text-[11px] text-gray-500">Origem: {doc.arquivo_origem_nome}</p>}</div></div>
                    <div className="flex items-center justify-between gap-2 sm:justify-start"><span className="pt-1 text-sm font-black text-gray-900">+{formatPointValue(lancamento.pontos_calculados)} pts</span><button type="button" onClick={() => remove(lancamento.id)} className={cn('flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm', pendingDeleteId === lancamento.id ? 'border-amber-200 text-amber-600' : 'border-red-200 text-red-500')}>{pendingDeleteId === lancamento.id ? <AlertCircle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}</button></div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">{lancamento.status_auditoria}</p>
                    <div className="flex flex-wrap gap-2">
                      {doc?.gedoc_links && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{doc.gedoc_links.length} link(s) de referência</span>}
                      {doc?.caminho_storage && <button type="button" onClick={() => void toggleViewer(doc)} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-500">{isOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{isOpen ? 'Ocultar documento' : 'Ver documento'}</button>}
                    </div>
                  </div>
                  {doc?.gedoc_links && <ul className="mt-3 space-y-1 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-[11px] text-emerald-900">{doc.gedoc_links.map((link) => <li key={link} className="truncate font-mono">{link}</li>)}</ul>}
                  {doc && isOpen && blobUrls[doc.id] && <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white"><iframe src={blobUrls[doc.id]} title={doc.nome_arquivo} className="h-[420px] w-full sm:h-[520px]" /></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
