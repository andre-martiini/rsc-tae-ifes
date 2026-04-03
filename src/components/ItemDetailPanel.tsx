import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { differenceInDays, format, isValid, parseISO } from 'date-fns';
import { PDFDocument } from 'pdf-lib';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
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
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';


type UploadMeta = { converted: boolean; originalName: string; originalMimeType: string };

export default function ItemDetailPanel({ item, onSaved }: { item: ItemRSC; onSaved: () => void }) {
  const { addDocumentoFromFile, addDocumentoFromGedocLinks, addLancamento, removeLancamento, documentos, servidor, lancamentos, processo } = useAppContext();
  const [tab, setTab] = useState<'form' | 'history'>('form');
  const [docMode, setDocMode] = useState<'upload' | 'reference'>('upload');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
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

  const isSubmitted = processo.status === 'Enviado';
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
    setSelectedDocId('');
    setUploadFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const resetForm = useCallback(() => {
    setDocMode('upload');
    setReferenceInput('');
    setReferenceLinks([]);
    setDataInicio('');
    setDataFim('');
    setOngoing(false);
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
      const mergedFile = new File([await merged.save()], `documentos-anexados-${fileList.length}.pdf`, { type: 'application/pdf' });
      if (mergedFile.size > 5 * 1024 * 1024) return void setUploadFeedback('O PDF consolidado excede 5MB.');
      setFile(mergedFile);
      setUploadMeta({ converted: true, originalName: `${fileList.length} arquivo(s) combinados`, originalMimeType: 'application/pdf' });
      setUploadFeedback(`${fileList.length} arquivo(s) consolidados em um único PDF.`);
    } catch {
      toast.error('Não foi possível preparar os arquivos selecionados.');
    }
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (docMode !== 'upload' || selectedDocId || isSubmitted) return;
      const pasted = Array.from(event.clipboardData?.items ?? []).map((item) => item.getAsFile()).find((item): item is File => !!item);
      if (!pasted) return;
      event.preventDefault();
      void acceptPreparedFile(pasted);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [docMode, isSubmitted, selectedDocId]);

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
    if (docMode === 'upload' && !file && !selectedDocId) return void toast.error('Anexe um documento comprobatório ou reutilize um já salvo.');
    try {
      setSaving(true);
      let documentoId: string | undefined = selectedDocId || undefined;
      if (docMode === 'reference') {
        documentoId = (await addDocumentoFromGedocLinks({ servidorId: servidor.id, links: referenceLinks })).id;
      } else if (file && !selectedDocId) {
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
        pontos_calculados: pontosCalculados,
      });
      toast.success(`Lançamento salvo! +${formatPointValue(pontosCalculados)} pts.`);
      resetForm();
      setTab('history');
      onSaved();
    } catch {
      toast.error('Não foi possível salvar este lançamento.');
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
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-8 py-6">
        <div className="mb-2 flex items-center gap-3">
          <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-xs text-primary">Item {item.numero}</span>
          <span className="text-sm text-gray-400">• Inciso {item.inciso}</span>
          {isFragile && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Enquadramento sensível</span>}
        </div>
        <h2 className="max-w-4xl text-3xl font-bold text-gray-900">{item.descricao}</h2>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 text-gray-500"><strong className="text-gray-900">{formatPointValue(item.pontos_por_unidade)} pts</strong> por {item.unidade_medida}</div>
          <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-emerald-700"><strong className="text-emerald-900">{formatPointValue(itemPontos)} pts</strong> já contabilizados neste item</div>
        </div>
      </div>

      <div className="border-b border-gray-100 bg-gray-50/60 px-8 py-3">
        <div className="flex gap-2">
          <button type="button" onClick={() => setTab('form')} className={cn('rounded-full px-4 py-2 text-sm font-semibold', tab === 'form' ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-600')}>Formulário</button>
          <button type="button" onClick={() => setTab('history')} className={cn('rounded-full px-4 py-2 text-sm font-semibold', tab === 'history' ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-600')}>Lançamentos ({itemLancamentos.length})</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {tab === 'form' ? (
          <div className={cn('space-y-8', isSubmitted && 'pointer-events-none opacity-60')}>
            <section className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setDocMode('upload'); setReferenceLinks([]); setReferenceInput(''); }} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold', docMode === 'upload' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-500')}><UploadCloud className="h-3.5 w-3.5" />Enviar arquivo</button>
                <button type="button" onClick={() => { setDocMode('reference'); resetUpload(); }} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold', docMode === 'reference' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-500')}><Link className="h-3.5 w-3.5" />{institutionConfig.documentLinks.inputLabel}</button>
              </div>
              {docMode === 'reference' ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-3 text-sm text-gray-600">{institutionConfig.documentLinks.helperText}</p>
                  <div className="flex gap-2">
                    <input type="url" value={referenceInput} onChange={(e) => setReferenceInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addReference(); } }} placeholder={institutionConfig.documentLinks.inputPlaceholder} className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm" />
                    <button type="button" onClick={addReference} className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary"><Plus className="h-4 w-4" /></button>
                  </div>
                  {referenceLinks.length > 0 && <ul className="mt-3 space-y-2">{referenceLinks.map((link, index) => <li key={link} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="flex-1 truncate font-mono">{link}</span><button type="button" onClick={() => setReferenceLinks((prev) => prev.filter((_, i) => i !== index))}><X className="h-3.5 w-3.5" /></button></li>)}</ul>}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(260px,1fr)]">
                  <div>
                    <div className={`relative flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-all ${file ? 'border-emerald-400 bg-emerald-50' : dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 bg-white'}`} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragActive(false); }} onDrop={(e) => { e.preventDefault(); setDragActive(false); void mergeAndAcceptFiles(e.dataTransfer.files); }}>
                      <input ref={fileInputRef} type="file" multiple accept={SUPPORTED_UPLOAD_ACCEPT} onChange={(e) => void mergeAndAcceptFiles(e.target.files)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                      {file && <button type="button" onClick={(e) => { e.stopPropagation(); resetUpload(); }} className="absolute right-3 top-3 rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><Trash2 className="h-4 w-4" /></button>}
                      <div className="mb-3 rounded-full bg-white/80 p-2.5"><UploadCloud className="h-6 w-6 text-gray-500" /></div>
                      <p className="max-w-[90%] truncate px-4 text-sm font-semibold text-gray-700" title={file?.name}>{file ? file.name : dragActive ? 'Solte os arquivos aqui' : 'Clique, arraste ou cole um arquivo'}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{file ? 'Arquivo pronto para persistir com hash' : 'PDF, JPG, PNG, TXT, MD ou JSON'}</p>
                    </div>
                    {uploadFeedback && <p className={`mt-3 text-xs ${file ? 'text-emerald-700' : 'text-gray-500'}`}>{uploadFeedback}</p>}
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-sm text-gray-600">Ou reutilize um documento já salvo.</p>
                    <select value={selectedDocId} onChange={(e) => { setSelectedDocId(e.target.value); if (e.target.value) resetUpload(); }} disabled={!!file} className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm">
                      <option value="">Buscar em documentos salvos...</option>
                      {documentos.filter((doc) => doc.servidor_id === servidor?.id).map((doc) => <option key={doc.id} value={doc.id}>{doc.nome_arquivo}{doc.hash_arquivo ? ` • hash ${doc.hash_arquivo.slice(0, 8)}` : ''}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {showDateFields && <>
                  <div className="space-y-2"><Label htmlFor="data-inicio">Data de início <span className="text-red-500">*</span></Label><Input id="data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="data-fim">Data de fim <span className="text-red-500">*</span></Label><Input id="data-fim" type="date" value={effectiveEndDate} onChange={(e) => setDataFim(e.target.value)} disabled={ongoing} /><label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} />Ainda em vigor</label></div>
                </>}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <div className="flex max-w-sm items-center gap-2">
                    <Input id="quantidade" type="number" min="0" step={allowsDecimals ? '0.01' : '1'} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="text-center text-lg font-bold" />
                    {item.quantidade_automatica && <Button type="button" variant="outline" onClick={calculateQuantityFromDates}><Calculator className="mr-2 h-4 w-4" />Calcular</Button>}
                  </div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-800">Cada unidade informada computará <strong>{formatPointValue(item.pontos_por_unidade)} pts</strong>.<br />Isto totalizará <strong>{formatPointValue(pointsPreview)} pts</strong> para este lançamento.</div>
              </div>
            </section>

            {isFragile && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-semibold">Item com enquadramento sensível</p><label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={confirmFragile} onChange={(e) => setConfirmFragile(e.target.checked)} />Confirmo que revisei o enquadramento deste item.</label></div></div></div>}

            <div className="flex justify-end border-t border-gray-100 pt-4"><Button onClick={() => void save()} disabled={saving} className="bg-primary text-white hover:bg-primary/90">{saving ? 'Salvando...' : 'Salvar lançamento'}</Button></div>
          </div>
        ) : (
          <div className="space-y-3">
            {itemLancamentos.length === 0 && <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Nenhum lançamento registrado para este item ainda.</div>}
            {itemLancamentos.map((lancamento) => {
              const doc = lancamento.documento_id ? docsById.get(lancamento.documento_id) : undefined;
              const isOpen = !!(doc && openDocs.has(doc.id));
              return (
                <div key={lancamento.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3"><div className="rounded-lg bg-green-50 p-2 text-green-700"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-sm font-bold text-gray-900">{lancamento.quantidade_informada} {item.unidade_medida || 'unidade(s)'}</p><p className="text-xs text-gray-500">{lancamento.data_inicio && lancamento.data_fim ? `${new Date(lancamento.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(lancamento.data_fim).toLocaleDateString('pt-BR')}` : 'Período não informado/exigido'}</p>{doc?.convertido_para_pdf && doc.arquivo_origem_nome && <p className="mt-1 text-[11px] text-gray-500">Origem: {doc.arquivo_origem_nome}</p>}</div></div>
                    <div className="flex items-start gap-2"><span className="pt-1 text-sm font-black text-gray-900">+{formatPointValue(lancamento.pontos_calculados)} pts</span><button type="button" onClick={() => remove(lancamento.id)} className={cn('flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm', pendingDeleteId === lancamento.id ? 'border-amber-200 text-amber-600' : 'border-red-200 text-red-500')}>{pendingDeleteId === lancamento.id ? <AlertCircle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}</button></div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">{lancamento.status_auditoria}</p>
                    <div className="flex flex-wrap gap-2">
                      {doc?.gedoc_links && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{doc.gedoc_links.length} link(s) de referência</span>}
                      {doc?.caminho_storage && <button type="button" onClick={() => void toggleViewer(doc)} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-500">{isOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{isOpen ? 'Ocultar documento' : 'Ver documento'}</button>}
                    </div>
                  </div>
                  {doc?.gedoc_links && <ul className="mt-3 space-y-1 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-[11px] text-emerald-900">{doc.gedoc_links.map((link) => <li key={link} className="truncate font-mono">{link}</li>)}</ul>}
                  {doc && isOpen && blobUrls[doc.id] && <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white"><iframe src={blobUrls[doc.id]} title={doc.nome_arquivo} className="h-[520px] w-full" /></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
