import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { PDFDocument } from 'pdf-lib';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  Info,
  Link,
  LoaderCircle,
  PencilLine,
  Plus,
  CirclePlay,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { institutionConfig, isValidInstitutionDocumentLink, normalizeInstitutionDocumentLink } from '../config/institution';
import type { Documento, ItemRSC, Lancamento } from '../data/mock';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { copyTextToClipboard } from '../lib/clipboard';
import { normalizeUploadToPdf, toPdfFile, SUPPORTED_UPLOAD_ACCEPT } from '../lib/documentConversion';
import { computeDocumentHash, getDocumentBlob } from '../lib/documentStorage';
import { addPointValues, calculateLancamentoPoints, formatPointValue, sumPointValues } from '../lib/points';
import { comprovantesDoLancamento, mesclarConteudoNoLancamento, mesclarLancamentosDoItem } from '../lib/mesclarLancamentos';
import { abrangenciaPeriodos, periodosDoLancamento, periodoValido, totalDiasBrutos, totalDiasPeriodos, unidadesAnoFracao, unidadesMes, type Periodo } from '../lib/periodos';
import { cn, formatarDataSegura } from '../lib/utils';
import { downloadFileFromUrl } from '../lib/urlDownloader';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { generateLLMPrompt } from '../lib/llmPrompt';
import { analyzePdfTranscription } from '../lib/pdfTranscription';
import { mapearUsoDocumentos, codigosItensDosUsos, type UsoDocumento } from '../lib/duplicateDetection';
import { deveAvisarQuantidadeDuplicada, somarQuantidadeLancada } from '../lib/quantidadeDuplicada';
import SingleAuditPromptModal from './SingleAuditPromptModal';

type UploadMeta = {
  converted: boolean;
  originalName: string;
  originalMimeType: string;
  transcription?: string;
  componentHashes?: string[];
  componentFiles?: Documento['arquivos_componentes'];
};

type PeriodoForm = { inicio: string; fim: string; emVigor: boolean };

const createEmptyPeriodo = (): PeriodoForm => ({ inicio: '', fim: '', emVigor: false });

type PeriodoSetter = React.Dispatch<React.SetStateAction<PeriodoForm[]>>;

const patchPeriodo = (setter: PeriodoSetter, index: number, patch: Partial<PeriodoForm>) =>
  setter((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

const addPeriodo = (setter: PeriodoSetter) => setter((prev) => [...prev, createEmptyPeriodo()]);

const removePeriodo = (setter: PeriodoSetter, index: number) =>
  setter((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

export default function ItemDetailPanel({ item, onSaved }: { item: ItemRSC; onSaved: () => void }) {
  const { addDocumentoFromFile, addDocumentoFromGedocLinks, addLancamento, updateLancamento, removeLancamento, addComprovanteToLancamento, removeComprovanteFromLancamento, documentos, servidor, lancamentos, processo, updateDocumento, deleteDocumento, itensRSC } = useAppContext();
  const [tab, setTab] = useState<'form' | 'history'>('form');
  const [docMode, setDocMode] = useState<'upload' | 'reference'>('upload');
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; meta: UploadMeta }>>([]);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [documentProxyAvailable, setDocumentProxyAvailable] = useState<boolean | null>(null);
  const [referenceInput, setReferenceInput] = useState('');
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoForm[]>([createEmptyPeriodo()]);
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteChoiceLancamento, setDeleteChoiceLancamento] = useState<Lancamento | null>(null);
  const [isDeletingLancamento, setIsDeletingLancamento] = useState(false);
  const [editingObservationId, setEditingObservationId] = useState<string | null>(null);
  const [editingObservation, setEditingObservation] = useState('');
  const [editingLancamentoId, setEditingLancamentoId] = useState<string | null>(null);
  const [editQtd, setEditQtd] = useState('');
  const [editPeriodos, setEditPeriodos] = useState<PeriodoForm[]>([createEmptyPeriodo()]);
  const [editObs, setEditObs] = useState('');
  const [addingFileToLancId, setAddingFileToLancId] = useState<string | null>(null);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement | null>(null);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const [openDocs, setOpenDocs] = useState<Set<string>>(new Set());
  const [promptModalText, setPromptModalText] = useState<string | null>(null);
  const [activeAuditLancamento, setActiveAuditLancamento] = useState<Lancamento | null>(null);
  const [uploadHelpOpen, setUploadHelpOpen] = useState(false);
  const [linksHelpOpen, setLinksHelpOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    doc: Documento;
    lancamentoParaPrompt: any;
    newDoc: Documento;
    usos: UsoDocumento[];
  } | null>(null);
  // Aviso de quantidade possivelmente duplicada (o novo lançamento repete o
  // total do item em vez de declarar só as unidades novas). Ver
  // `lib/quantidadeDuplicada.ts`.
  const [quantidadeWarning, setQuantidadeWarning] = useState<{
    lancamentoParaPrompt: any;
    newDoc?: Documento;
    lancamentosExistentes: number;
    qtdJaLancada: number;
    pontosJaLancados: number;
    quantidadeNova: number;
    docsNovos: number;
  } | null>(null);
  // Escolha entre somar o novo conteúdo ao lançamento existente do item
  // (caminho recomendado — ver lib/mesclarLancamentos.ts) ou criar um
  // lançamento separado.
  const [mergeChoice, setMergeChoice] = useState<{
    lancamentoParaPrompt: any;
    newDoc?: Documento;
    alvo: Lancamento;
  } | null>(null);
  const [mergeAllOpen, setMergeAllOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isSubmitted = processo.status === 'Em triagem';
  const allowsDecimals = item.quantidade_automatica || /tempo|m.s|ano/i.test(item.unidade_medida);
  const showDateFields = item.modo_calculo !== 'manual';
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const toPeriodos = (rows: PeriodoForm[]): Periodo[] => rows.map((row) => ({ inicio: row.inicio, fim: row.emVigor ? hoje : row.fim }));
  const effectivePeriodos = toPeriodos(periodos);
  const quantidadeNumerica = Number.parseFloat(quantidade);
  const itemLancamentos = useMemo(() => lancamentos.filter((entry) => entry.servidor_id === servidor?.id && entry.item_rsc_id === item.id), [item.id, lancamentos, servidor?.id]);
  const itemPontos = useMemo(() => sumPointValues(itemLancamentos.map((entry) => entry.pontos_calculados)), [itemLancamentos]);
  const pointsPreview = Number.isFinite(quantidadeNumerica) && quantidadeNumerica > 0 ? calculateLancamentoPoints(quantidadeNumerica, item.pontos_por_unidade) : 0;
  const docsById = useMemo(() => new Map(documentos.map((doc) => [doc.id, doc])), [documentos]);

  useEffect(() => () => Object.values<string>(blobUrls).forEach((url) => URL.revokeObjectURL(url)), [blobUrls]);

  useEffect(() => {
    if (!uploadHelpOpen && !linksHelpOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUploadHelpOpen(false);
        setLinksHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uploadHelpOpen, linksHelpOpen]);

  const resetUpload = useCallback(() => {
    setPendingFiles([]);
    setUploadFeedback(null);
    setIsPreparingUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const resetForm = useCallback(() => {
    setDocMode('upload');
    setReferenceInput('');
    setReferenceLinks([]);
    setIsDownloading(false);
    setPeriodos([createEmptyPeriodo()]);
    setQuantidade('');
    setObservacao('');
    resetUpload();
  }, [resetUpload]);

  useEffect(() => {
    setTab('form');
    setPendingDeleteId(null);
    resetForm();
  }, [item.id, resetForm]);

  useEffect(() => {
    if (docMode !== 'reference') return;

    let cancelled = false;

    const checkDocumentProxy = async () => {
      try {
        const response = await fetch('/api/document-proxy?health=1');
        const contentType = response.headers.get('content-type') ?? '';
        const signature = response.headers.get('X-Document-Proxy');
        const available =
          response.ok &&
          signature === 'rsc-tae' &&
          contentType.toLowerCase().includes('application/json');

        if (!cancelled) {
          setDocumentProxyAvailable(available);
        }
      } catch {
        if (!cancelled) {
          setDocumentProxyAvailable(false);
        }
      }
    };

    void checkDocumentProxy();

    return () => {
      cancelled = true;
    };
  }, [docMode]);

  const acceptPreparedFile = async (incoming: File | null) => {
    if (!incoming) return;
    setIsPreparingUpload(true);
    setUploadFeedback(`Preparando ${incoming.name}...`);
    const toastId = toast.loading('Processando arquivo e extraindo texto...');
    try {
      const originalHash = await computeDocumentHash(incoming);
      const normalized = await normalizeUploadToPdf(incoming);
      toast.dismiss(toastId);
      if (normalized.file.size > 20 * 1024 * 1024) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadFeedback('O arquivo excede o limite de 20 MB. Reduza o tamanho ou otimize o PDF e tente novamente.');
        setIsPreparingUpload(false);
        return;
      }
      const meta: UploadMeta = {
        converted: normalized.converted,
        originalName: normalized.originalName,
        originalMimeType: normalized.originalMimeType,
        transcription: normalized.transcription,
        componentHashes: [originalHash],
        componentFiles: [{ nome_arquivo: incoming.name, hash_arquivo: originalHash }],
      };
      setPendingFiles((prev) => [...prev, { file: normalized.file, meta }]);
      setUploadFeedback(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.dismiss();
      setUploadFeedback(error instanceof Error ? error.message : 'Formato inválido.');
    }
    setIsPreparingUpload(false);
  };

  const handleFileInput = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    for (const f of Array.from(fileList) as File[]) {
      await acceptPreparedFile(f);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

    const handleConsolidateLinks = async () => {
    if (referenceLinks.length === 0) return;

    try {
      setIsDownloading(true);
      setUploadFeedback(`Processando ${referenceLinks.length} link(s)...`);

      const downloadedFiles: File[] = [];
      const componentFiles: NonNullable<Documento['arquivos_componentes']> = [];
      const failedLinks: string[] = [];
      let successCount = 0;

      for (const link of referenceLinks) {
        setUploadFeedback(`Baixando link ${successCount + 1}/${referenceLinks.length}...`);
        try {
          const file = await downloadFileFromUrl(link);
          const hash = await computeDocumentHash(file);
          componentFiles.push({ nome_arquivo: file.name, hash_arquivo: hash });
          downloadedFiles.push(file);
          successCount++;
        } catch (err) {
          console.error(`Falha ao baixar link: ${link}`, err);
          failedLinks.push(link);
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

      const consolidatedMeta: UploadMeta = {
        converted: true,
        originalName: `${downloadedFiles.length} link(s) consolidados`,
        originalMimeType: 'application/pdf',
        transcription: undefined,
        componentHashes: componentFiles.map((entry) => entry.hash_arquivo),
        componentFiles,
      };
      setPendingFiles((prev) => [...prev, { file: mergedFile, meta: consolidatedMeta }]);
      setDocMode('upload'); // Switch to upload mode after consolidation
      toast.success('Links baixados e consolidados em um único PDF!');
      if (failedLinks.length > 0) {
        toast.warning(
          `${failedLinks.length} link(s) nao puderam ser anexados automaticamente. As referencias originais continuam disponiveis para salvar o lancamento.`,
          { duration: 9000 },
        );
      }
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
    if (!trimmed) return;
    const normalizedReference = normalizeInstitutionDocumentLink(trimmed);
    if (referenceLinks.includes(normalizedReference)) return void toast.error('Este link ja foi adicionado.');
    if (!isValidInstitutionDocumentLink(trimmed)) return void toast.error(`URL inválida. Use um endereço HTTP(S), como: ${institutionConfig.documentLinks.inputPlaceholder}`);
    if (referenceLinks.includes(trimmed)) return void toast.error('Este link já foi adicionado.');
    setReferenceLinks((prev) => [...prev, normalizedReference]);
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
    if (effectivePeriodos.some((p) => !p.inicio || !p.fim)) return void toast.error('Preencha as datas de todos os períodos antes de calcular.');
    if (!effectivePeriodos.every(periodoValido)) return void toast.error('Informe períodos válidos (fim igual ou posterior ao início).');
    const totalDias = totalDiasPeriodos(effectivePeriodos);
    if (totalDiasBrutos(effectivePeriodos) > totalDias) {
      toast.info('Há períodos sobrepostos — os dias coincidentes foram contados uma única vez.');
    }
    if (item.modo_calculo === 'auto_ano_fracao') {
      // A regra "por ano ou fração acima de seis meses" (art. 5º e Anexos) é
      // aplicada sobre o tempo total somado de todos os períodos, não por período.
      const unidades = unidadesAnoFracao(totalDias);
      if (unidades < 1) {
        setQuantidade('0');
        return void toast.warning('Tempo total de até 6 meses — não computa unidade para este item.');
      }
      setQuantidade(String(unidades));
    } else {
      setQuantidade(String(unidadesMes(totalDias)));
    }
  };

  const calculateQuantityForEdit = () => {
    const editPeriodosEffective = toPeriodos(editPeriodos);
    if (editPeriodosEffective.some((p) => !p.inicio || !p.fim)) return void toast.error('Preencha as datas de todos os períodos antes de calcular.');
    if (!editPeriodosEffective.every(periodoValido)) return void toast.error('Informe períodos válidos (fim igual ou posterior ao início).');
    const totalDias = totalDiasPeriodos(editPeriodosEffective);
    if (totalDiasBrutos(editPeriodosEffective) > totalDias) {
      toast.info('Há períodos sobrepostos — os dias coincidentes foram contados uma única vez.');
    }
    if (item.modo_calculo === 'auto_ano_fracao') {
      const unidades = unidadesAnoFracao(totalDias);
      if (unidades < 1) {
        setEditQtd('0');
        return void toast.warning('Tempo total de até 6 meses — não computa unidade para este item.');
      }
      setEditQtd(String(unidades));
    } else {
      setEditQtd(String(unidadesMes(totalDias)));
    }
  };

  const prepareDocumentForPrompt = useCallback(async (doc?: Documento) => {
    if (!doc?.caminho_storage) {
      return doc;
    }

    const needsTranscription =
      !doc.transcricao ||
      (!doc.transcricao.includes('--- DIAGNOSTICO DE TRANSCRICAO ---') && doc.transcricao.includes('--- P'));

    if (!needsTranscription) {
      return doc;
    }

    const toastId = toast.loading('Transcrevendo documento para análise...');

    try {
      const blob = await getDocumentBlob(doc.id);
      if (!blob) {
        toast.error('Documento não encontrado no armazenamento local.', { id: toastId });
        return doc;
      }

      let text = '';
      const fileName = doc.nome_arquivo.toLowerCase();
      const isPdf = blob.type === 'application/pdf' || fileName.endsWith('.pdf');
      const isImage = /^image\//i.test(blob.type) || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
      const isTextFile = blob.type.startsWith('text/') || /\.(txt|md|json)$/i.test(fileName);

      console.log(`[PromptPrep] doc=${doc.id}, blobType="${blob.type}", fileName="${doc.nome_arquivo}", isPdf=${isPdf}, isImage=${isImage}`);

      if (isPdf) {
        const pdfFile = new File([blob], doc.nome_arquivo, { type: 'application/pdf' });
        text = (await analyzePdfTranscription(pdfFile)).text;
      } else if (isImage) {
        const { extractTextFromImage } = await import('../lib/ocr');
        text = await extractTextFromImage(blob);
      } else if (isTextFile) {
        text = await blob.text();
      }

      console.log(`[PromptPrep] Resultado: ${text.length} caracteres extraídos.`);

      if (!text) {
        toast.error('Não foi possível extrair texto. O documento pode ser uma imagem escaneada.', { id: toastId });
        return doc;
      }

      updateDocumento(doc.id, { transcricao: text });
      const updatedDoc = { ...doc, transcricao: text };
      toast.success('Transcrição concluída!', { id: toastId });
      return updatedDoc;
    } catch (err) {
      console.error('Erro na preparação do prompt:', err);
      toast.error('Não foi possível transcrever este documento.', { id: toastId });
      return doc;
    }
  }, [updateDocumento]);

  const save = async () => {
    if (!servidor || saving) return;
    if (!quantidade.trim() || Number.isNaN(quantidadeNumerica) || quantidadeNumerica <= 0) return void toast.error('Informe uma quantidade maior que zero.');
    if (item.modo_calculo !== 'manual' && !effectivePeriodos.every(periodoValido)) return void toast.error('Este item exige datas de início e fim válidas em todos os períodos.');
    if (docMode === 'reference' && referenceLinks.length === 0) return void toast.error(`Adicione ao menos um ${institutionConfig.documentLinks.label}.`);
    if ((docMode === 'upload') && pendingFiles.length === 0) return void toast.error('Anexe ao menos um documento comprobatório.');
    try {
      setSaving(true);
      let documentoId: string | undefined = undefined;
      let allComprovanteIds: string[] = [];
      let newDoc: Documento | undefined = undefined;
      let isDuplicate = false;

      if (docMode === 'reference') {
        newDoc = await addDocumentoFromGedocLinks({
          servidorId: servidor.id,
          links: referenceLinks,
        });
        documentoId = newDoc.id;
        allComprovanteIds = [newDoc.id];
        // O mesmo conjunto de links reaproveita o documento de referência
        // existente — se ele já pontua em outro lançamento, passa pelo mesmo
        // aviso de dupla contagem do upload de arquivos.
        const usosReferencia = mapearUsoDocumentos(lancamentos, itensRSC).get(newDoc.id) ?? [];
        if (usosReferencia.length > 0) {
          isDuplicate = true;
        }
      } else if (pendingFiles.length > 0) {
        const uploadedIds: string[] = [];
        let duplicateDocFound: Documento | undefined = undefined;
        for (const { file: f, meta } of pendingFiles) {
          const result = await addDocumentoFromFile({
            servidorId: servidor.id,
            file: f,
            sourceName: meta.originalName,
            sourceMimeType: meta.originalMimeType,
            convertedToPdf: meta.converted,
            transcription: meta.transcription,
            componentHashes: meta.componentHashes,
            componentFiles: meta.componentFiles,
          });
          // O mesmo arquivo selecionado duas vezes retorna o mesmo doc.id —
          // sem este guard o lançamento listaria o comprovante em duplicidade.
          if (!uploadedIds.includes(result.doc.id)) uploadedIds.push(result.doc.id);
          if (!newDoc) newDoc = result.doc;
          if (result.exists && !duplicateDocFound) {
            duplicateDocFound = result.doc;
            isDuplicate = true;
          }
        }
        documentoId = uploadedIds[0];
        allComprovanteIds = uploadedIds;
        if (isDuplicate && duplicateDocFound) {
          newDoc = duplicateDocFound;
        }
      }
      const pontosCalculados = calculateLancamentoPoints(quantidadeNumerica, item.pontos_por_unidade);
      const abrangencia = showDateFields ? abrangenciaPeriodos(effectivePeriodos) : null;
      const lancamentoParaPrompt = {
        servidor_id: servidor.id,
        item_rsc_id: item.id,
        documento_id: documentoId,
        comprovantes_ids: allComprovanteIds.length > 0 ? allComprovanteIds : (documentoId ? [documentoId] : []),
        data_inicio: abrangencia?.inicio ?? '',
        data_fim: abrangencia?.fim ?? '',
        periodos: showDateFields ? effectivePeriodos : undefined,
        quantidade_informada: quantidadeNumerica,
        declaracao_nao_duplicidade: true,
        pontos_calculados: pontosCalculados,
        observacao: observacao.trim() || undefined,
      };

      if (isDuplicate && newDoc) {
        // O arquivo já existe — o registro é sempre reaproveitado (nunca é
        // criada uma cópia). Só pede confirmação quando o documento já pontua
        // em algum lançamento, pois aí há risco real de dupla contagem.
        const usos = mapearUsoDocumentos(lancamentos, itensRSC).get(newDoc.id) ?? [];
        if (usos.length > 0) {
          setDuplicateWarning({
            doc: newDoc,
            lancamentoParaPrompt,
            newDoc,
            usos,
          });
          setSaving(false);
          return;
        }
        toast.info(`O arquivo "${newDoc.nome_arquivo}" já estava no sistema — o documento existente foi reaproveitado, sem criar cópia.`);
      }

      // Guard contra dupla contagem de quantidade: em itens manuais, o total
      // do item é a SOMA dos lançamentos, então cada novo lançamento deve
      // declarar apenas as unidades novas. Aviso dispensável — um único
      // comprovante pode legitimamente provar várias unidades.
      const docsNovos = allComprovanteIds.length;
      if (deveAvisarQuantidadeDuplicada(item.modo_calculo, itemLancamentos, quantidadeNumerica, docsNovos)) {
        setQuantidadeWarning({
          lancamentoParaPrompt,
          newDoc,
          lancamentosExistentes: itemLancamentos.length,
          qtdJaLancada: somarQuantidadeLancada(itemLancamentos),
          pontosJaLancados: itemPontos,
          quantidadeNova: quantidadeNumerica,
          docsNovos,
        });
        setSaving(false);
        return;
      }

      continuarSalvamento(lancamentoParaPrompt, newDoc);
    } catch (error) {
      // Surface duplicate-upload validation and other recoverable messages.
      const message =
        error instanceof Error ? error.message : 'Não foi possível salvar este lançamento.';
      toast.error(message);
      setSaving(false);
    }
  };

  // Itens fragmentados em vários lançamentos disparam alertas de possível
  // duplicidade na avaliação — quando o item já tem lançamento, o caminho
  // recomendado é somar o novo conteúdo a ele, e criar lançamento separado
  // passa a ser uma escolha explícita.
  const continuarSalvamento = (lancamentoParaPrompt: any, newDoc?: Documento) => {
    const alvo = itemLancamentos[itemLancamentos.length - 1];
    if (alvo) {
      setMergeChoice({ lancamentoParaPrompt, newDoc, alvo });
      return;
    }
    finishSave(lancamentoParaPrompt, newDoc);
  };

  // Em itens com quantidade derivada dos períodos, a soma das quantidades não
  // desconta dias cobertos por mais de um lançamento — só a pessoa pode dizer
  // se a sobreposição é real, então avisa para recalcular.
  const avisarSobreposicaoPeriodos = (periodosMesclados?: Periodo[]) => {
    if (!item.quantidade_automatica || !periodosMesclados || periodosMesclados.length < 2) return;
    if (totalDiasBrutos(periodosMesclados) > totalDiasPeriodos(periodosMesclados)) {
      toast.warning(
        'Os lançamentos somados têm períodos sobrepostos — confira a quantidade em "Editar lançamento" → "Calcular" para não contar dias em dobro.',
        { duration: 12000 },
      );
    }
  };

  const executarMesclagem = () => {
    if (!mergeChoice) return;
    const { lancamentoParaPrompt, alvo } = mergeChoice;
    const patch = mesclarConteudoNoLancamento(
      alvo,
      {
        comprovantes_ids: lancamentoParaPrompt.comprovantes_ids ?? [],
        quantidade_informada: lancamentoParaPrompt.quantidade_informada,
        periodos: lancamentoParaPrompt.periodos,
        observacao: lancamentoParaPrompt.observacao,
      },
      item.pontos_por_unidade,
    );
    setMergeChoice(null);
    if (!updateLancamento(alvo.id, patch)) {
      toast.error('Não foi possível somar ao lançamento existente.');
      setSaving(false);
      return;
    }
    avisarSobreposicaoPeriodos(patch.periodos);
    toast.success(
      `Comprovantes somados ao lançamento existente — total de ${formatPointValue(patch.quantidade_informada)} ${item.unidade_medida || 'unidade(s)'} (${formatPointValue(patch.pontos_calculados)} pts).`,
    );
    resetForm();
    setTab('history');
    onSaved();
    setSaving(false);
  };

  const criarLancamentoSeparado = () => {
    if (!mergeChoice) return;
    const pendente = mergeChoice;
    setMergeChoice(null);
    finishSave(pendente.lancamentoParaPrompt, pendente.newDoc);
  };

  const executarMesclagemTotal = () => {
    const resultado = mesclarLancamentosDoItem(itemLancamentos, item.pontos_por_unidade);
    setMergeAllOpen(false);
    if (!resultado) return;
    if (!updateLancamento(resultado.alvoId, resultado.patch)) {
      return void toast.error('Não foi possível mesclar os lançamentos.');
    }
    resultado.removerIds.forEach((id) => removeLancamento(id));
    setEditingLancamentoId(null);
    setEditingObservationId(null);
    setPendingDeleteId(null);
    avisarSobreposicaoPeriodos(resultado.patch.periodos);
    toast.success(
      `${resultado.removerIds.length + 1} lançamentos mesclados em um único — ${formatPointValue(resultado.patch.quantidade_informada)} ${item.unidade_medida || 'unidade(s)'} (${formatPointValue(resultado.patch.pontos_calculados)} pts). Nenhum arquivo foi apagado.`,
    );
    onSaved();
  };

  const finishSave = (lancamentoParaPrompt: any, newDoc?: Documento) => {
    const savedLanc = addLancamento(lancamentoParaPrompt);

    toast.success(`Lançamento salvo! +${formatPointValue(lancamentoParaPrompt.pontos_calculados)} pts.`, {
      description: 'Deseja validar esta comprovação com uma IA agora?',
      action: {
        label: 'Gerar Prompt IA',
        onClick: async () => {
          // Inclui todos os comprovantes do lançamento recém-salvo, não só o primeiro.
          const idsComprovantes: string[] = savedLanc.comprovantes_ids ?? (newDoc ? [newDoc.id] : []);
          const docsResolvidos = idsComprovantes
            .map((id) => docsById.get(id) ?? (newDoc?.id === id ? newDoc : undefined))
            .filter((d): d is Documento => !!d);
          const baseDocs = docsResolvidos.length > 0 ? docsResolvidos : (newDoc ? [newDoc] : []);
          const preparedDocs = await Promise.all(baseDocs.map((doc) => prepareDocumentForPrompt(doc)));
          const prompt = generateLLMPrompt({
            item,
            lancamento: savedLanc,
            documentos: preparedDocs.filter((d): d is Documento => !!d),
            servidor,
          });
          setPromptModalText(prompt);
          setActiveAuditLancamento(savedLanc);
        },
      },
    });
    resetForm();
    setTab('history');
    onSaved();
    setSaving(false);
    setDuplicateWarning(null);
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

  const removeWithDocumentChoice = (lancamentoId: string) => {
    if (pendingDeleteId !== lancamentoId) {
      setPendingDeleteId(lancamentoId);
      return void toast.warning('Clique novamente para confirmar a exclusão.');
    }

    const lancamento = lancamentos.find((entry) => entry.id === lancamentoId);
    const comprovantesIds = lancamento?.comprovantes_ids ?? (lancamento?.documento_id ? [lancamento.documento_id] : []);
    const algumUsadoEmOutro = comprovantesIds.some((docId) =>
      lancamentos.some((entry) => entry.id !== lancamentoId && (entry.comprovantes_ids ?? []).includes(docId)),
    );

    if (lancamento && comprovantesIds.length > 0 && !algumUsadoEmOutro) {
      setDeleteChoiceLancamento(lancamento);
      return;
    }

    if (!removeLancamento(lancamentoId)) return void toast.error('Não foi possível remover este lançamento.');
    setPendingDeleteId(null);
    toast.success(algumUsadoEmOutro ? 'Lançamento removido. Os documentos foram mantidos porque ainda estão vinculados a outro lançamento.' : 'Lançamento removido.');
  };

  const startEditingObservation = (lancamento: Lancamento) => {
    setEditingObservationId(lancamento.id);
    setEditingObservation(lancamento.observacao ?? '');
  };

  const cancelEditingObservation = () => {
    setEditingObservationId(null);
    setEditingObservation('');
  };

  const saveObservation = (lancamentoId: string) => {
    const nextObservation = editingObservation.trim();
    const updated = updateLancamento(lancamentoId, { observacao: nextObservation || undefined });
    if (!updated) {
      toast.error('N\u00e3o foi poss\u00edvel atualizar a observa\u00e7\u00e3o.');
      return;
    }

    cancelEditingObservation();
    toast.success(nextObservation ? 'Observa\u00e7\u00e3o atualizada.' : 'Observa\u00e7\u00e3o removida.');
  };

  const startEditingLancamento = (lancamento: Lancamento) => {
    setEditingLancamentoId(lancamento.id);
    setEditQtd(String(lancamento.quantidade_informada));
    const periodosExistentes = periodosDoLancamento(lancamento);
    setEditPeriodos(periodosExistentes.length > 0 ? periodosExistentes.map((p) => ({ ...p, emVigor: false })) : [createEmptyPeriodo()]);
    setEditObs(lancamento.observacao ?? '');
    setEditingObservationId(null);
  };

  const cancelEditingLancamento = () => {
    setEditingLancamentoId(null);
  };

  const saveEditingLancamento = (lancamento: Lancamento) => {
    const qtdNum = Number.parseFloat(editQtd);
    if (!editQtd.trim() || Number.isNaN(qtdNum) || qtdNum <= 0) {
      return void toast.error('Informe uma quantidade maior que zero.');
    }
    const periodosEditados = toPeriodos(editPeriodos);
    if (item.modo_calculo !== 'manual' && !periodosEditados.every(periodoValido)) {
      return void toast.error('Este item exige datas de início e fim válidas em todos os períodos.');
    }
    const abrangencia = item.modo_calculo !== 'manual' ? abrangenciaPeriodos(periodosEditados) : null;
    const novos_pontos = calculateLancamentoPoints(qtdNum, item.pontos_por_unidade);
    updateLancamento(lancamento.id, {
      quantidade_informada: qtdNum,
      data_inicio: abrangencia?.inicio ?? '',
      data_fim: abrangencia?.fim ?? '',
      periodos: item.modo_calculo !== 'manual' ? periodosEditados : undefined,
      observacao: editObs.trim() || undefined,
      pontos_calculados: novos_pontos,
    });
    setEditingLancamentoId(null);
    toast.success(`Lançamento atualizado. ${formatPointValue(novos_pontos)} pts.`);
    onSaved();
  };

  const handleAddFileToLancamento = async (e: React.ChangeEvent<HTMLInputElement>, lancamentoId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !servidor) return;
    const lancamentoAlvo = lancamentos.find((l) => l.id === lancamentoId);
    const idsJaAnexados = new Set(lancamentoAlvo ? comprovantesDoLancamento(lancamentoAlvo) : []);
    const idsNovos = new Set<string>();
    setIsAddingFile(true);
    try {
      for (const f of Array.from(files) as File[]) {
        const normalized = await normalizeUploadToPdf(f);
        const originalHash = await computeDocumentHash(f);
        const result = await addDocumentoFromFile({
          servidorId: servidor.id,
          file: normalized.file,
          sourceName: normalized.originalName,
          sourceMimeType: normalized.originalMimeType,
          convertedToPdf: normalized.converted,
          transcription: normalized.transcription,
          componentHashes: [originalHash],
          componentFiles: [{ nome_arquivo: f.name, hash_arquivo: originalHash }],
        });
        if (result.exists) {
          const usos = (mapearUsoDocumentos(lancamentos, itensRSC).get(result.doc.id) ?? [])
            .filter((u) => u.lancamento.id !== lancamentoId);
          if (usos.length > 0) {
            toast.warning(
              `"${result.doc.nome_arquivo}" já pontua no(s) item(ns) ${codigosItensDosUsos(usos).join(', ')} — o mesmo documento não deve ser contado em duplicidade.`,
              { duration: 10000 },
            );
          }
        }
        if (!idsJaAnexados.has(result.doc.id)) idsNovos.add(result.doc.id);
        addComprovanteToLancamento(lancamentoId, result.doc.id);
      }
      const docsNovos = idsNovos.size;
      // Em itens de contagem manual a quantidade não acompanha o anexo — sem
      // esta oferta, o comprovante entra mas as unidades novas ficam de fora
      // da pontuação (ou o usuário cria outro lançamento só para isso).
      if (lancamentoAlvo && docsNovos > 0 && item.modo_calculo === 'manual') {
        const qtdAtual = lancamentoAlvo.quantidade_informada;
        const novaQtd = addPointValues(qtdAtual, docsNovos);
        const novosPontos = calculateLancamentoPoints(novaQtd, item.pontos_por_unidade);
        toast.success(`${docsNovos === 1 ? 'Arquivo adicionado' : `${docsNovos} arquivos adicionados`} ao lançamento.`, {
          description: `A quantidade declarada segue ${formatPointValue(qtdAtual)}. Se os novos comprovantes provam unidades ainda não declaradas, some-as.`,
          action: {
            label: `Somar +${docsNovos}`,
            onClick: () => {
              if (!updateLancamento(lancamentoId, { quantidade_informada: novaQtd, pontos_calculados: novosPontos })) return;
              toast.success(`Quantidade atualizada para ${formatPointValue(novaQtd)} (${formatPointValue(novosPontos)} pts).`);
              onSaved();
            },
          },
          duration: 15000,
        });
      } else {
        toast.success(`${files.length === 1 ? 'Arquivo adicionado' : `${files.length} arquivos adicionados`} ao lançamento.`);
      }
    } catch {
      toast.error('Não foi possível adicionar o arquivo.');
    } finally {
      setIsAddingFile(false);
      setAddingFileToLancId(null);
      if (addFileInputRef.current) addFileInputRef.current.value = '';
    }
  };

  const confirmRemoveLancamento = async (deleteLinkedDocument: boolean) => {
    if (!deleteChoiceLancamento) return;
    const lancamento = deleteChoiceLancamento;
    const comprovantesIds = lancamento.comprovantes_ids ?? (lancamento.documento_id ? [lancamento.documento_id] : []);

    try {
      setIsDeletingLancamento(true);
      if (!removeLancamento(lancamento.id)) {
        toast.error('Não foi possível remover este lançamento.');
        return;
      }

      if (deleteLinkedDocument && comprovantesIds.length > 0) {
        for (const docId of comprovantesIds) {
          await deleteDocumento(docId);
        }
        toast.success('Lançamento e documentos removidos.');
      } else {
        toast.success('Lançamento removido. Os documentos foram mantidos no inventário.');
      }

      setPendingDeleteId(null);
      setDeleteChoiceLancamento(null);
    } catch {
      toast.error('Não foi possível concluir a remoção.');
    } finally {
      setIsDeletingLancamento(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
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
          <div className={cn('space-y-5 pb-4', isSubmitted && 'pointer-events-none opacity-60')}>
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
                  <p className="mb-2 text-xs text-gray-500">{institutionConfig.documentLinks.helperText}</p>
                  <p className="text-[11px] text-gray-500">
                    Salvar o lançamento por link já registra a comprovação. O botão abaixo é opcional e tenta anexar uma cópia local do PDF quando o portal institucional permitir esse acesso.
                  </p>
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setLinksHelpOpen(true)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-100 bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 shadow-sm hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      aria-label="Ver exemplo de envio de multiplos links institucionais"
                    >
                      <CirclePlay className="h-3.5 w-3.5" />
                      Ver exemplo
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input type="url" value={referenceInput} onChange={(e) => setReferenceInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addReference(); } }} placeholder={institutionConfig.documentLinks.inputPlaceholder} className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm" />
                    <button
                      type="button"
                      onClick={addReference}
                      disabled={!referenceInput.trim()}
                      className={cn(
                        "flex h-9 w-full items-center justify-center rounded-lg border sm:w-9 transition-colors",
                        referenceInput.trim()
                          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                          : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {referenceLinks.length > 0 && (
                    <>
                      <ul className="mt-3 space-y-1.5">{referenceLinks.map((link, index) => <li key={link} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="flex-1 truncate font-mono">{link}</span><button type="button" onClick={() => setReferenceLinks((prev) => prev.filter((_, i) => i !== index))}><X className="h-3.5 w-3.5" /></button></li>)}</ul>

                      <div className="mt-4 border-t border-gray-200 pt-4">
                        {documentProxyAvailable === false && (
                          <p className="mb-2 text-center text-[10px] text-amber-700">
                            O anexo automatico de PDFs nao esta disponivel nesta versao do sistema. Voce ainda pode salvar normalmente usando apenas os links institucionais.
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          onClick={() => void handleConsolidateLinks()}
                          disabled={isDownloading || documentProxyAvailable === false}
                        >
                          {isDownloading ? (
                            <>Processando...</>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Tentar anexar PDFs
                            </>
                          )}
                        </Button>
                        {uploadFeedback && <p className="mt-2 text-center text-[10px] text-gray-500">{uploadFeedback}</p>}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`relative rounded-xl border p-4 transition-all ${isPreparingUpload ? 'border-blue-300 bg-blue-50/70' : dragActive ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'}`} onDragOver={(e) => { e.preventDefault(); if (!isPreparingUpload) setDragActive(true); }} onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragActive(false); }} onDrop={(e) => { e.preventDefault(); setDragActive(false); if (!isPreparingUpload) void handleFileInput(e.dataTransfer.files); }}>
                    <input ref={fileInputRef} type="file" multiple accept={SUPPORTED_UPLOAD_ACCEPT} onChange={(e) => void handleFileInput(e.target.files)} disabled={isPreparingUpload} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait" />
                    <div className="relative z-10 mb-3 flex items-start justify-between gap-3 pr-2 text-xs text-gray-500">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span>Clique, arraste ou cole arquivos. Aceitamos PDF, JPG, PNG, TXT, MD ou JSON.</span>
                        <span className="font-semibold text-gray-700">Limite: 20 MB por arquivo.</span>
                        <div className="inline-flex items-center gap-1">
                          <span>Arquivo grande?</span>
                          <div className="group relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 w-72 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 bg-gray-900 text-white text-xs rounded-md py-2 px-3 shadow-lg text-left font-normal leading-relaxed">
                              <p className="font-semibold mb-1">Como reduzir o tamanho do PDF:</p>
                              <ul className="list-disc pl-3 space-y-1">
                                <li>Utilize ferramentas ou compressores de PDF da sua preferência.</li>
                                <li>Ao salvar o documento original (Word ou Docs), exporte no formato otimizado para web.</li>
                                <li>Divida o PDF em partes menores ou anexe apenas as páginas essenciais da comprovação.</li>
                                <li>Diminua a resolução de imagens e prints antes de adicioná-los ao documento.</li>
                              </ul>
                              <div className="absolute left-1/2 bottom-full -mb-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setUploadHelpOpen(true); }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-100 bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 shadow-sm hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        aria-label="Ver exemplo de envio de multiplos arquivos"
                      >
                        <CirclePlay className="h-3.5 w-3.5" />
                        Ver exemplo
                      </button>
                    </div>
                    <div className={`flex min-h-9 items-center rounded-lg border border-dashed bg-white px-3 text-sm ${isPreparingUpload ? 'border-blue-300 text-blue-800' : 'border-gray-200 text-gray-700'}`}>
                      <div className="mr-2 rounded-full bg-white/80 p-1">
                        {isPreparingUpload ? <LoaderCircle className="h-4 w-4 animate-spin text-blue-500" /> : <UploadCloud className="h-4 w-4 text-gray-400" />}
                      </div>
                      <p className="flex-1 truncate">
                        {isPreparingUpload
                          ? (uploadFeedback ?? 'Preparando arquivo...')
                          : dragActive
                            ? 'Solte os arquivos aqui'
                            : 'Clique ou arraste para adicionar arquivos'}
                      </p>
                      <p className="ml-3 shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-400">{isPreparingUpload ? 'Processando' : 'Adicionar'}</p>
                    </div>
                  </div>
                  {uploadFeedback && <p className={`text-xs ${isPreparingUpload ? 'text-blue-700' : 'text-red-600'}`}>{uploadFeedback}</p>}
                  {/* Lista de arquivos pendentes */}
                  {pendingFiles.length > 0 && (
                    <div className="space-y-1.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">{pendingFiles.length} arquivo{pendingFiles.length !== 1 ? 's' : ''} prontos para envio</p>
                      {pendingFiles.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-gray-800">{entry.meta.originalName}</p>
                              {entry.meta.converted && <p className="text-[10px] text-gray-400">convertido para PDF</p>}
                              <p className="text-[10px] text-gray-400">{(entry.file.size / 1024).toFixed(0)} KB</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => removePendingFile(index)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-100 text-red-400 hover:bg-red-50">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="space-y-4">
              {showDateFields && (
                <div className="space-y-3">
                  {periodos.map((periodo, index) => (
                    <div key={index} className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`data-inicio-${index}`} className="text-xs">
                          {periodos.length > 1 ? `Período ${index + 1} — início` : 'Data de início'} <span className="text-red-500">*</span>
                        </Label>
                        <Input id={`data-inicio-${index}`} type="date" value={periodo.inicio} onChange={(e) => patchPeriodo(setPeriodos, index, { inicio: e.target.value })} className="h-11 text-sm" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`data-fim-${index}`} className="text-xs">
                            {periodos.length > 1 ? `Período ${index + 1} — fim` : 'Data de fim'} <span className="text-red-500">*</span>
                          </Label>
                          {periodos.length > 1 && (
                            <button type="button" onClick={() => removePeriodo(setPeriodos, index)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600">
                              <Trash2 className="h-3 w-3" />Remover
                            </button>
                          )}
                        </div>
                        <Input id={`data-fim-${index}`} type="date" value={periodo.emVigor ? hoje : periodo.fim} onChange={(e) => patchPeriodo(setPeriodos, index, { fim: e.target.value })} disabled={periodo.emVigor} className="h-11 text-sm" />
                        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-500">
                          <input type="checkbox" checked={periodo.emVigor} onChange={(e) => patchPeriodo(setPeriodos, index, { emVigor: e.target.checked })} className="h-3 w-3" />
                          Ainda em vigor
                        </label>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => addPeriodo(setPeriodos)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10">
                    <Plus className="h-3.5 w-3.5" />Adicionar período
                  </button>
                  <p className="text-[11px] text-gray-400">
                    Tem mais de uma designação (ex.: várias portarias)? Informe um período para cada uma — o cálculo soma o tempo de todos os períodos antes de aplicar a regra de pontuação.
                  </p>
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

              <div className="space-y-1.5">
                <Label htmlFor="observacao" className="text-xs">Observações (opcional)</Label>
                <textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Utilize este campo para fornecer uma contextualização detalhada dos documentos comprobatórios (ex.: citar documentos ou página de documentos, portarias relacionadas ou referências adicionais)."
                  className="w-full min-h-[80px] rounded-lg border border-gray-200 bg-white p-2.5 text-sm focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5"
                  rows={3}
                />
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-3">
            {itemLancamentos.length === 0 && <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Nenhum lançamento registrado para este item ainda.</div>}
            {!isSubmitted && itemLancamentos.length >= 2 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Este item está dividido em {itemLancamentos.length} lançamentos</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                      Reunir todos os comprovantes em um lançamento único (quantidades somadas, períodos e observações preservados) facilita a conferência pela comissão e evita alertas de duplicidade na avaliação. Nenhum arquivo é apagado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMergeAllOpen(true)}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90"
                  >
                    <Plus className="h-3.5 w-3.5" />Mesclar em um lançamento único
                  </button>
                </div>
              </div>
            )}
            {/* Input oculto para adicionar arquivo a lançamento existente */}
            <input
              ref={addFileInputRef}
              type="file"
              accept={SUPPORTED_UPLOAD_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => addingFileToLancId && void handleAddFileToLancamento(e, addingFileToLancId)}
            />
            {itemLancamentos.map((lancamento) => {
              const comprovantesIds = lancamento.comprovantes_ids ?? (lancamento.documento_id ? [lancamento.documento_id] : []);
              const comprovantes = comprovantesIds.map((id) => docsById.get(id)).filter(Boolean) as Documento[];
              const isEditing = editingLancamentoId === lancamento.id;
              return (
                <div key={lancamento.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                  {/* Cabeçalho: dados principais + botão excluir */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-green-50 p-2 text-green-700"><CheckCircle2 className="h-5 w-5" /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{lancamento.quantidade_informada} {item.unidade_medida || 'unidade(s)'}</p>
                        {(() => {
                          const periodosLanc = periodosDoLancamento(lancamento);
                          if (periodosLanc.length === 0) {
                            return <p className="text-xs text-gray-500">Período não informado/exigido</p>;
                          }
                          return periodosLanc.map((p, i) => (
                            <p key={i} className="text-xs text-gray-500">
                              {periodosLanc.length > 1 ? `Período ${i + 1}: ` : ''}{formatarDataSegura(p.inicio)} a {formatarDataSegura(p.fim)}
                            </p>
                          ));
                        })()}
                        {comprovantes.length > 0 && (
                          <p className="mt-0.5 text-[11px] text-gray-400">{comprovantes.length} arquivo{comprovantes.length !== 1 ? 's' : ''} anexado{comprovantes.length !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-start">
                      <span className="pt-1 text-sm font-black text-gray-900">+{formatPointValue(lancamento.pontos_calculados)} pts</span>
                      <button
                        type="button"
                        onClick={() => removeWithDocumentChoice(lancamento.id)}
                        className={cn('flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm', pendingDeleteId === lancamento.id ? 'border-amber-200 text-amber-600' : 'border-red-200 text-red-500')}
                      >
                        {pendingDeleteId === lancamento.id ? <AlertCircle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Modo de edição completa */}
                  {isEditing ? (
                    <div className="mt-3 space-y-3 rounded-xl border border-primary/20 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Editar lançamento</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Quantidade</Label>
                          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                            <Input
                              type="number"
                              min="0"
                              step={allowsDecimals ? '0.01' : '1'}
                              value={editQtd}
                              onChange={(e) => setEditQtd(e.target.value)}
                              className="h-9 text-center font-bold sm:w-[150px] sm:shrink-0"
                            />
                            {item.quantidade_automatica && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={calculateQuantityForEdit}
                                className="h-9 rounded-md border-green-300 bg-green-50/60 px-3 text-xs font-semibold text-green-700 hover:border-green-400 hover:bg-green-100/70 hover:text-green-800"
                              >
                                <Calculator className="mr-1.5 h-3.5 w-3.5" />Calcular
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {item.modo_calculo !== 'manual' && (
                        <div className="space-y-2">
                          {editPeriodos.map((periodo, index) => (
                            <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
                              <div className="space-y-1">
                                <Label className="text-xs">{editPeriodos.length > 1 ? `Período ${index + 1} — início` : 'Data início'}</Label>
                                <Input type="date" value={periodo.inicio} onChange={(e) => patchPeriodo(setEditPeriodos, index, { inicio: e.target.value })} className="h-9" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{editPeriodos.length > 1 ? `Período ${index + 1} — fim` : 'Data fim'}</Label>
                                <Input type="date" value={periodo.fim} onChange={(e) => patchPeriodo(setEditPeriodos, index, { fim: e.target.value })} className="h-9" />
                              </div>
                              {editPeriodos.length > 1 && (
                                <button type="button" onClick={() => removePeriodo(setEditPeriodos, index)} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-500 hover:bg-red-50">
                                  <Trash2 className="h-3.5 w-3.5" />Remover
                                </button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => addPeriodo(setEditPeriodos)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
                            <Plus className="h-3 w-3" />Adicionar período
                          </button>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">Observação (opcional)</Label>
                        <textarea
                          value={editObs}
                          onChange={(e) => setEditObs(e.target.value)}
                          placeholder="Observação complementar..."
                          className="w-full min-h-[72px] rounded-lg border border-gray-200 bg-white p-2.5 text-sm focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5"
                          rows={3}
                        />
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={cancelEditingLancamento} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                          <X className="h-3.5 w-3.5" />Cancelar
                        </button>
                        <button type="button" onClick={() => saveEditingLancamento(lancamento)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90">
                          <Save className="h-3.5 w-3.5" />Salvar alterações
                        </button>
                      </div>
                    </div>
                  ) : lancamento.observacao && (
                    <div className="mt-2.5 rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-700 italic">
                      <strong>Observação:</strong> {lancamento.observacao}
                    </div>
                  )}

                  {/* Lista de arquivos anexados */}
                  {!isEditing && comprovantes.length > 0 && (
                    <div className="mt-3 space-y-1.5 rounded-xl border border-gray-100 bg-white p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Arquivos anexados</p>
                      {comprovantes.map((doc) => {
                        const isOpen = openDocs.has(doc.id);
                        return (
                          <div key={doc.id}>
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium text-gray-700">
                                    {doc.arquivo_origem_nome ?? doc.nome_arquivo}
                                  </p>
                                  {doc.tamanho_bytes && (
                                    <p className="text-[10px] text-gray-400">{(doc.tamanho_bytes / 1024).toFixed(0)} KB{doc.convertido_para_pdf ? ' · convertido' : ''}</p>
                                  )}
                                  {doc.gedoc_links && (
                                    <p className="text-[10px] text-emerald-600">{doc.gedoc_links.length} link(s) institucional(is)</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                {doc.caminho_storage && (
                                  <button
                                    type="button"
                                    onClick={() => void toggleViewer(doc)}
                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100"
                                    title={isOpen ? 'Ocultar' : 'Visualizar'}
                                  >
                                    {isOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                )}
                                {!isSubmitted && comprovantes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => void removeComprovanteFromLancamento(lancamento.id, doc.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-red-100 bg-white text-red-400 hover:bg-red-50"
                                    title="Remover este arquivo"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {doc.gedoc_links && (
                              <ul className="mt-1 space-y-0.5 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[10px] text-emerald-900">
                                {doc.gedoc_links.map((link) => <li key={link} className="truncate font-mono">{link}</li>)}
                              </ul>
                            )}
                            {isOpen && blobUrls[doc.id] && (
                              <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                <iframe src={blobUrls[doc.id]} title={doc.nome_arquivo} className="h-[420px] w-full sm:h-[520px]" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {!isSubmitted && (
                        <button
                          type="button"
                          disabled={isAddingFile && addingFileToLancId === lancamento.id}
                          onClick={() => {
                            setAddingFileToLancId(lancamento.id);
                            addFileInputRef.current?.click();
                          }}
                          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50 py-2 text-xs font-semibold text-gray-500 hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:opacity-60"
                        >
                          {isAddingFile && addingFileToLancId === lancamento.id
                            ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Adicionando...</>
                            : <><Plus className="h-3.5 w-3.5" />Adicionar arquivo</>
                          }
                        </button>
                      )}
                    </div>
                  )}

                  {/* Barra de ações */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">{lancamento.status_auditoria}</p>
                    <div className="flex flex-wrap gap-2">
                      {!isEditing && !isSubmitted && (
                        <button
                          type="button"
                          onClick={() => startEditingLancamento(lancamento)}
                          className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/5"
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          Editar lançamento
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          // Transcreve e inclui TODOS os comprovantes do lançamento,
                          // não apenas o primeiro (o botão antes só usava comprovantes[0]).
                          const finalDocs = comprovantes.length > 0
                            ? await Promise.all(comprovantes.map((doc) => prepareDocumentForPrompt(doc)))
                            : [];
                          const prompt = generateLLMPrompt({
                            item,
                            lancamento,
                            documentos: finalDocs.filter((d): d is Documento => !!d),
                            servidor,
                          });
                          setPromptModalText(prompt);
                          setActiveAuditLancamento(lancamento);
                        }}
                        className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                        title="Copiar prompt para testar este lançamento em uma IA (inclui todos os documentos anexados)"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Validar com IA
                      </button>
                      <div className="relative group/tooltip flex items-center">
                        <div className="flex items-center justify-center text-gray-400 hover:text-violet-600 cursor-help transition-colors">
                          <Info className="h-4 w-4" />
                        </div>
                        <div className="pointer-events-none absolute top-full right-0 mt-3 w-64 origin-top-right scale-95 opacity-0 transition-all duration-200 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 z-[999]">
                          <div className="rounded-xl border border-violet-100 bg-white p-3.5 shadow-2xl ring-1 ring-black/5">
                            <div className="absolute -top-1 right-2 h-2 w-2 rotate-45 border-t border-l border-violet-50 bg-white" />
                            <div className="mb-2.5 flex items-center gap-2 border-b border-violet-50 pb-2">
                              <Sparkles className="h-3 w-3 text-violet-500" />
                              <p className="text-[11px] font-black uppercase tracking-wider text-violet-700">Guia de Validação com IA</p>
                            </div>
                            <ul className="space-y-2 text-[10px] leading-relaxed text-gray-600">
                              <li className="flex gap-2">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">1</span>
                                <span>Clique no botão <strong>Validar com IA</strong> para copiar o prompt e a transcrição.</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">2</span>
                                <span>Abra sua IA favorita (<strong>ChatGPT, Claude ou Gemini</strong>).</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">3</span>
                                <span>Cole o texto (Ctrl+V) e <strong>anexe o documento PDF</strong> original para análise cruzada.</span>
                              </li>
                            </ul>
                            <div className="mt-3 rounded-lg bg-violet-50/50 p-2 text-[9px] font-medium text-violet-600 italic leading-snug">
                              A IA atuará como um avaliador técnico do RSC baseado na legislação oficial. Este recurso deve ser usado apenas como ferramenta de apoio; as IAs podem cometer erros.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {tab === 'form' && !isSubmitted && (
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={saving} className="bg-primary text-white hover:bg-primary/90">
              {saving ? 'Salvando...' : 'Salvar lançamento'}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Launch Modal */}
      {deleteChoiceLancamento && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={isDeletingLancamento ? undefined : () => {
            setDeleteChoiceLancamento(null);
            setPendingDeleteId(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-launch-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 id="delete-launch-title" className="text-lg font-black tracking-tight text-gray-900">Remover lançamento?</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Este lançamento possui um documento vinculado. Você pode manter o documento no inventário ou apagar também o documento para que ele não apareça na aba Documentos.
              </p>

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Documento vinculado</p>
                <p className="mt-1 break-words text-sm font-bold text-gray-900">
                  {documentos.find((doc) => doc.id === deleteChoiceLancamento.documento_id)?.nome_arquivo ?? 'Documento vinculado'}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void confirmRemoveLancamento(true)}
                  disabled={isDeletingLancamento}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingLancamento && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  Remover lançamento e documento
                </button>
                <button
                  type="button"
                  onClick={() => void confirmRemoveLancamento(false)}
                  disabled={isDeletingLancamento}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remover só o lançamento
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteChoiceLancamento(null);
                    setPendingDeleteId(null);
                  }}
                  disabled={isDeletingLancamento}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Help Modal */}
      {uploadHelpOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setUploadHelpOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-help-title"
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 id="upload-help-title" className="text-base font-bold text-gray-900">Como enviar múltiplos arquivos</h3>
                <p className="mt-0.5 text-xs text-gray-500">Exemplo rápido da mesclagem automática no envio.</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadHelpOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Fechar exemplo de envio"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <video
                className="aspect-video w-full rounded-lg border border-gray-200 bg-gray-950 object-contain"
                src="/arrastar_multiplos.mp4"
                autoPlay
                loop
                muted
                playsInline
                controls
              />
              <p className="text-sm leading-relaxed text-gray-700">
                Arraste vários arquivos para a área de envio. O sistema anexará e mesclará os arquivos automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Links Help Modal */}
      {linksHelpOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setLinksHelpOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="links-help-title"
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 id="links-help-title" className="text-base font-bold text-gray-900">Como anexar múltiplos links</h3>
                <p className="mt-0.5 text-xs text-gray-500">Exemplo rápido da anexação e mesclagem de PDFs institucionais.</p>
              </div>
              <button
                type="button"
                onClick={() => setLinksHelpOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Fechar exemplo de links"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <video
                className="aspect-video w-full rounded-lg border border-gray-200 bg-gray-950 object-contain"
                src="/multiplos_links.mp4"
                autoPlay
                loop
                muted
                playsInline
                controls
              />
              <p className="text-sm leading-relaxed text-gray-700">
                Informe links institucionais válidos, adicione quantos forem necessários e use a opção de anexar PDFs para que o sistema tente baixar e mesclar os documentos automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Single Audit Prompt Modal */}
      {promptModalText && activeAuditLancamento && (
        <SingleAuditPromptModal
          open={!!promptModalText}
          onClose={() => {
            setPromptModalText(null);
            setActiveAuditLancamento(null);
          }}
          servidor={servidor}
          item={item}
          lancamento={activeAuditLancamento}
          prompt={promptModalText}
        />
      )}

      {/* Duplicate Warning Modal */}
      <AnimatePresence>
        {duplicateWarning && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
            >
              {/* Decorative background element */}
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-50" />
              <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-blue-50" />

              <div className="relative p-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner">
                  <AlertCircle className="h-8 w-8" />
                </div>

                <h3 className="mb-3 text-xl font-black tracking-tight text-gray-900">Atenção: documento já pontua no processo</h3>

                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-gray-600">
                    O arquivo <strong className="text-gray-900">"{duplicateWarning.doc.nome_arquivo}"</strong> já está no sistema
                    e <strong className="text-gray-900">já pontua no(s) item(ns) {codigosItensDosUsos(duplicateWarning.usos).join(', ')}</strong>.
                  </p>

                  <p className="text-sm text-gray-500">
                    O mesmo documento não deve ser contado em duplicidade. Se prosseguir, o registro existente
                    será reaproveitado (não é criada cópia), mas o novo lançamento pode ser apontado como
                    dupla contagem na auditoria.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => {
                      const pendente = duplicateWarning;
                      setDuplicateWarning(null);
                      continuarSalvamento(pendente.lancamentoParaPrompt, pendente.newDoc);
                    }}
                    className="flex-1 bg-amber-600 font-bold text-white hover:bg-amber-700 shadow-lg shadow-amber-200"
                  >
                    Prosseguir mesmo assim
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDuplicateWarning(null);
                      setSaving(false);
                      resetUpload();
                    }}
                    className="text-gray-500 hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Aviso de quantidade possivelmente duplicada */}
      <AnimatePresence>
        {quantidadeWarning && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
            >
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-50" />
              <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-blue-50" />

              <div className="relative p-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner">
                  <AlertCircle className="h-8 w-8" />
                </div>

                <h3 className="mb-3 text-xl font-black tracking-tight text-gray-900">Confira a quantidade deste lançamento</h3>

                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-gray-600">
                    Este item já tem <strong className="text-gray-900">{quantidadeWarning.lancamentosExistentes} lançamento(s)</strong> somando{' '}
                    <strong className="text-gray-900">{formatPointValue(quantidadeWarning.qtdJaLancada)} unidade(s)</strong>{' '}
                    ({formatPointValue(quantidadeWarning.pontosJaLancados)} pts). Você está criando um novo lançamento com{' '}
                    <strong className="text-gray-900">{formatPointValue(quantidadeWarning.quantidadeNova)} unidade(s)</strong>, mas anexando{' '}
                    <strong className="text-gray-900">{quantidadeWarning.docsNovos} comprovante(s)</strong>.
                  </p>

                  <p className="text-sm text-gray-500">
                    A quantidade deste lançamento deve conter APENAS as unidades novas — o total do item é a soma de todos
                    os lançamentos. Se um único comprovante realmente prova várias unidades (ex.: uma portaria que lista
                    todas as designações), pode salvar assim mesmo.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => setQuantidadeWarning(null)}
                    className="flex-1 bg-amber-600 font-bold text-white hover:bg-amber-700 shadow-lg shadow-amber-200"
                  >
                    Corrigir quantidade
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const pendente = quantidadeWarning;
                      setQuantidadeWarning(null);
                      continuarSalvamento(pendente.lancamentoParaPrompt, pendente.newDoc);
                    }}
                    className="text-gray-500 hover:bg-gray-100"
                  >
                    Salvar assim mesmo
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Escolha: somar ao lançamento existente ou criar separado */}
      <AnimatePresence>
        {mergeChoice && (() => {
          const qtdAlvo = mergeChoice.alvo.quantidade_informada;
          const qtdNova = mergeChoice.lancamentoParaPrompt.quantidade_informada as number;
          const docsNovos = (mergeChoice.lancamentoParaPrompt.comprovantes_ids ?? []).length;
          const qtdTotal = addPointValues(qtdAlvo, qtdNova);
          const pontosTotal = calculateLancamentoPoints(qtdTotal, item.pontos_por_unidade);
          const unidade = item.unidade_medida || 'unidade(s)';
          return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
              >
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-50" />
                <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-green-50" />

                <div className="relative p-8">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <h3 className="mb-3 text-xl font-black tracking-tight text-gray-900">Este item já tem um lançamento</h3>

                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-gray-600">
                      O total do item é a <strong className="text-gray-900">soma dos lançamentos</strong>. Reunir todos os
                      comprovantes em um lançamento único facilita a conferência pela comissão e evita alertas de
                      duplicidade na avaliação.
                    </p>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                      <p>Lançamento existente: <strong>{formatPointValue(qtdAlvo)} {unidade}</strong></p>
                      <p>Novo conteúdo: <strong>{formatPointValue(qtdNova)} {unidade}</strong> · {docsNovos} comprovante(s)</p>
                      <p className="mt-1 border-t border-gray-200 pt-1">
                        Resultado da soma: <strong className="text-gray-900">{formatPointValue(qtdTotal)} {unidade} ({formatPointValue(pontosTotal)} pts)</strong>
                      </p>
                    </div>

                    {itemLancamentos.length >= 2 && (
                      <p className="text-xs text-gray-500">
                        O conteúdo será somado ao lançamento mais recente. Para reunir também os demais, use
                        "Mesclar em um lançamento único" na aba de lançamentos.
                      </p>
                    )}
                  </div>

                  <div className="mt-8 flex flex-col gap-3">
                    <Button
                      onClick={executarMesclagem}
                      className="bg-primary font-bold text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                    >
                      Somar ao lançamento existente (recomendado)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={criarLancamentoSeparado}
                      className="border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Criar lançamento separado
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMergeChoice(null);
                        setSaving(false);
                      }}
                      className="text-gray-500 hover:bg-gray-100"
                    >
                      Cancelar e voltar ao formulário
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Confirmação da mesclagem de todos os lançamentos do item */}
      {mergeAllOpen && (() => {
        const qtdTotal = itemLancamentos.reduce((soma, l) => addPointValues(soma, l.quantidade_informada), 0);
        const pontosTotal = calculateLancamentoPoints(qtdTotal, item.pontos_por_unidade);
        const unidade = item.unidade_medida || 'unidade(s)';
        return (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setMergeAllOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-all-title"
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-primary/20 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <h3 id="merge-all-title" className="text-lg font-black tracking-tight text-gray-900">Mesclar {itemLancamentos.length} lançamentos em um único?</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-600">
                  <li>Todos os comprovantes ficam reunidos no lançamento mais antigo do item.</li>
                  <li>As quantidades são somadas: <strong className="text-gray-900">{formatPointValue(qtdTotal)} {unidade} ({formatPointValue(pontosTotal)} pts)</strong> — a pontuação total do item não muda.</li>
                  <li>Períodos e observações de todos os lançamentos são preservados.</li>
                  <li>Nenhum arquivo é apagado do inventário.</li>
                </ul>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={executarMesclagemTotal}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90"
                  >
                    Mesclar lançamentos
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeAllOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
