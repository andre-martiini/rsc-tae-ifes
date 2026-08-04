import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clipboard,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  PencilLine,
  Sparkles,
  ShieldCheck,
  PlayCircle,
  FolderOpen,
  GitMerge,
  PlusCircle,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '../components/MainLayout';
import DossieTutorialModal from '../components/DossieTutorialModal';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAppContext } from '../context/AppContext';
import type { Documento } from '../data/mock';
import type { EstadoTriagem, SugestaoTriagem } from '../data/triagem';
import { needsTranscription, transcribeDocument, type PrepStatus } from '../lib/transcricao';
import { estimatePromptTokens } from '../lib/auditPrompt';
import { calculateLancamentoPoints, formatPointValue } from '../lib/points';
import { abrangenciaPeriodos, totalDiasPeriodos, unidadesAnoFracao, unidadesMes, periodoValido, periodosDoLancamento, mesclarPeriodos, intersecaoPeriodos } from '../lib/periodos';
import { mapearUsoDocumentos, codigosItensDosUsos, encontrarDuplicatasPorConteudo, chaveConteudo } from '../lib/duplicateDetection';
import { gerarLotesTriagem } from '../lib/triagemPrompt';
import { parseResultadoTriagem } from '../lib/triagemParser';
import { pareceJson, pareceSerPrompt } from '../lib/jsonDetect';
import { gerarPromptAuditoriaEstruturada, excedeLimiteTokens } from '../lib/auditoriaPrompt';
import { parseResultadoAuditoria } from '../lib/auditoriaParser';
import { getEligibleRscLevel } from '../lib/rsc';
import { getLancamentoDocumentIds, itemDossierCode } from '../lib/documentOrdering';
import { deveAvisarQuantidadeDuplicada } from '../lib/quantidadeDuplicada';
import { getDocumentBlob } from '../lib/documentStorage';
import { cn } from '../lib/utils';

const MIN_CHARS_LEGIVEL = 80;

function baixarPromptArquivo(prompt: string, siape: string, loteIndex: number, totalLotes: number) {
  const siapeLimpo = siape.replace(/\D/g, '') || 'servidor';
  const date = new Date().toISOString().slice(0, 10);
  const sufixo = totalLotes > 1 ? `-lote-${loteIndex + 1}` : '';
  const blob = new Blob([prompt], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `prompt-triagem-rsc-${siapeLimpo}-${date}${sufixo}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

type Etapa = 'documentos' | 'analise' | 'revisao' | 'auditoria';

type DocUploadStatus = {
  docId: string;
  status: 'pendente' | 'transcrevendo' | 'transcrito' | 'falha' | 'ilegivel';
  transcricao_len?: number;
  erro?: string;
};

export default function Triagem() {
  const {
    servidor,
    documentos,
    itensRSC,
    triagem,
    setTriagem,
    atualizarSugestao,
    limparTriagem,
    addDocumentoFromFile,
    updateDocumento,
    addLancamento,
    updateLancamento,
    lancamentos,
    processo,
    importarOperacoesAuditoria,
  } = useAppContext();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, DocUploadStatus>>({});
  const [prepStatus, setPrepStatus] = useState<PrepStatus>({ total: 0, current: 0, failures: [] });
  const [etapa, setEtapa] = useState<Etapa>('documentos');
  const [respostaColada, setRespostaColada] = useState('');
  const [errosColagem, setErrosColagem] = useState<string[]>([]);
  // Fluxo sequencial de lotes do prompt de classificação (mesmo padrão do Consolidar):
  // um lote por vez, avanço automático ao colar a resposta, banner do lote concluído.
  const [loteAtualTriagem, setLoteAtualTriagem] = useState(0);
  const [ultimoLoteConcluidoTriagem, setUltimoLoteConcluidoTriagem] = useState<number | null>(null);
  const [editingSugestaoId, setEditingSugestaoId] = useState<string | null>(null);
  const [editItemRscId, setEditItemRscId] = useState<string>('');
  const [editPeriodos, setEditPeriodos] = useState<Array<{ inicio: string; fim: string }>>([{ inicio: '', fim: '' }]);
  const [editQuantidade, setEditQuantidade] = useState('1');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'confirmada' | 'descartada'>('todos');
  const [viewerDoc, setViewerDoc] = useState<Documento | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [respostaAuditoria, setRespostaAuditoria] = useState('');
  const [errosAuditoria, setErrosAuditoria] = useState<string[]>([]);
  const [docsExpandidos, setDocsExpandidos] = useState<Set<string>>(new Set());
  const [tutorialOpen, setTutorialOpen] = useState(false);

  if (!servidor) {
    return <Navigate to="/" replace />;
  }

  // ── Visualização de documento ──────────────────────────────────────────
  const handleViewDoc = useCallback(async (doc: Documento) => {
    setViewerDoc(doc);
    setViewerUrl(null);
    setViewerError(null);
    setViewerLoading(true);

    try {
      const blob = await getDocumentBlob(doc.id);
      if (!blob) {
        setViewerError('Arquivo local não encontrado neste navegador.');
        return;
      }
      const isPdf = blob.type.toLowerCase().includes('pdf') || doc.nome_arquivo.toLowerCase().endsWith('.pdf');
      const viewerBlob = isPdf && blob.type !== 'application/pdf'
        ? new Blob([blob], { type: 'application/pdf' })
        : blob;
      setViewerUrl(URL.createObjectURL(viewerBlob));
    } catch {
      setViewerError('Não foi possível carregar a visualização do arquivo.');
    } finally {
      setViewerLoading(false);
    }
  }, []);

  // Revogar URL do objeto quando o visualizador fechar
  useEffect(() => {
    if (viewerUrl && !viewerDoc) {
      URL.revokeObjectURL(viewerUrl);
      setViewerUrl(null);
    }
  }, [viewerUrl, viewerDoc]);

  // ── Documentos da triagem ──────────────────────────────────────────────
  const triagemDocs = useMemo(() => {
    const ids = triagem?.documento_ids ?? [];
    return ids.map((id) => documentos.find((d) => d.id === id)).filter((d): d is Documento => !!d);
  }, [triagem, documentos]);

  const documentosIlegiveis = useMemo(() => {
    return new Set(
      triagemDocs
        .filter((d) => (d.transcricao?.trim().length ?? 0) < MIN_CHARS_LEGIVEL)
        .map((d) => d.id),
    );
  }, [triagemDocs]);

  // ── Lançamentos do servidor e reuso de documentos ─────────────────────
  const lancamentosDoServidor = useMemo(
    () => lancamentos.filter((l) => l.servidor_id === servidor.id),
    [lancamentos, servidor],
  );

  /** docId -> lançamentos em que o documento já pontua. */
  const usoDocumentos = useMemo(
    () => mapearUsoDocumentos(lancamentosDoServidor, itensRSC),
    [lancamentosDoServidor, itensRSC],
  );

  const documentosDoServidor = useMemo(
    () => documentos.filter((d) => d.servidor_id === servidor.id),
    [documentos, servidor],
  );

  /** docId -> outros documentos com transcrição idêntica (re-scan/re-export). */
  const duplicatasConteudo = useMemo(
    () => encontrarDuplicatasPorConteudo(documentosDoServidor),
    [documentosDoServidor],
  );

  /** Documentos da sessão que ainda não estão na triagem e podem ser analisados. */
  const docsExistentesForaDaTriagem = useMemo(() => {
    const naTriagem = new Set(triagem?.documento_ids ?? []);
    return documentosDoServidor.filter(
      (d) =>
        d.tipo_documento !== 'instrucao_processual' &&
        !naTriagem.has(d.id) &&
        (!!d.caminho_storage || !!d.transcricao?.trim()),
    );
  }, [documentosDoServidor, triagem]);

  // ── Transcrição em série (upload novo e documentos existentes) ────────
  const transcreverEmSerie = useCallback(async (docs: Documento[]) => {
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];

      setUploadStatuses((prev) => ({ ...prev, [doc.id]: { ...prev[doc.id], docId: doc.id, status: 'transcrevendo' } }));
      setPrepStatus((prev) => ({ ...prev, total: docs.length, current: i + 1, currentName: doc.nome_arquivo }));

      try {
        const text = await transcribeDocument(doc);
        updateDocumento(doc.id, { transcricao: text });

        const usefulChars = text.trim().length;
        const isIlegivel = usefulChars < MIN_CHARS_LEGIVEL;
        setUploadStatuses((prev) => ({
          ...prev,
          [doc.id]: {
            docId: doc.id,
            status: isIlegivel ? 'ilegivel' : 'transcrito',
            transcricao_len: usefulChars,
          },
        }));

        // Conteúdo idêntico a um documento já existente (arquivo binariamente
        // diferente — re-scan/re-export — que o hash do upload não detecta).
        const chaveNova = chaveConteudo({ transcricao: text });
        if (chaveNova) {
          const igual = documentosDoServidor.find(
            (d) => d.id !== doc.id && chaveConteudo(d) === chaveNova,
          );
          if (igual) {
            toast.warning(
              `"${doc.nome_arquivo}" tem conteúdo idêntico a "${igual.nome_arquivo}", que já está no sistema. Verifique se não é o mesmo comprovante digitalizado duas vezes.`,
              { duration: 10000 },
            );
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'falha desconhecida';
        setUploadStatuses((prev) => ({ ...prev, [doc.id]: { docId: doc.id, status: 'falha', erro: msg } }));
        setPrepStatus((prev) => ({ ...prev, failures: [...prev.failures, `${doc.nome_arquivo}: ${msg}`] }));
      }
    }
  }, [updateDocumento, documentosDoServidor]);

  // ── Upload handler ─────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    const newDocIds: string[] = [];
    const newDocs: Documento[] = [];
    const newStatuses: Record<string, DocUploadStatus> = {};
    let duplicadosCount = 0;
    const avisosJaPontua: string[] = [];

    for (const file of fileArray) {
      try {
        const { doc, exists } = await addDocumentoFromFile({
          servidorId: servidor.id,
          file,
          tipoDocumento: 'comprobatorio_principal',
        });
        if (exists) {
          // Já está no sistema — inclui na triagem mas não re-transcreve
          duplicadosCount++;
          const usos = usoDocumentos.get(doc.id);
          if (usos && usos.length > 0) {
            avisosJaPontua.push(`"${doc.nome_arquivo}" já pontua no(s) item(ns) ${codigosItensDosUsos(usos).join(', ')}`);
          }
          // Só adiciona à triagem se ainda não estiver lá
          const jaNaTriagem = (triagem?.documento_ids ?? []).includes(doc.id) || newDocIds.includes(doc.id);
          if (!jaNaTriagem) {
            newDocIds.push(doc.id);
            newDocs.push(doc);
            newStatuses[doc.id] = { docId: doc.id, status: 'transcrito', transcricao_len: doc.transcricao?.trim().length ?? 0 };
          }
          continue;
        }
        newDocIds.push(doc.id);
        newDocs.push(doc);
        newStatuses[doc.id] = { docId: doc.id, status: 'pendente' };
      } catch (error) {
        toast.error(`Falha ao enviar ${file.name}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
      }
    }

    if (duplicadosCount > 0) {
      toast.info(`${duplicadosCount} documento(s) duplicado(s) já existente(s) no sistema — o registro original foi reaproveitado, sem criar cópia.`);
    }
    if (avisosJaPontua.length > 0) {
      toast.warning(
        `Atenção: ${avisosJaPontua.join('; ')}. Confirmar nova sugestão com o mesmo documento pode gerar dupla contagem.`,
        { duration: 12000 },
      );
    }

    setUploadStatuses((prev) => ({ ...prev, ...newStatuses }));

    // Atualizar estado da triagem
    setTriagem((current) => ({
      schema_version: 1,
      documento_ids: [...(current?.documento_ids ?? []), ...newDocIds],
      sugestoes: current?.sugestoes ?? [],
      ultima_colagem_em: current?.ultima_colagem_em,
      erros_ultima_colagem: current?.erros_ultima_colagem,
    }));

    // Transcrever em série usando os docs retornados diretamente
    await transcreverEmSerie(newDocs.filter((d) => !d.transcricao?.trim()));

    setIsUploading(false);
    setPrepStatus({ total: 0, current: 0, failures: [] });
  }, [servidor, addDocumentoFromFile, setTriagem, triagem, usoDocumentos, transcreverEmSerie]);

  // ── Incluir documentos já existentes na triagem (sem re-upload) ────────
  const handleIncluirExistentes = useCallback(async (docs: Documento[]) => {
    if (docs.length === 0) return;

    setTriagem((current) => ({
      schema_version: 1,
      documento_ids: [...(current?.documento_ids ?? []), ...docs.map((d) => d.id)],
      sugestoes: current?.sugestoes ?? [],
      ultima_colagem_em: current?.ultima_colagem_em,
      erros_ultima_colagem: current?.erros_ultima_colagem,
    }));

    const comTranscricao = docs.filter((d) => !!d.transcricao?.trim());
    setUploadStatuses((prev) => ({
      ...prev,
      ...Object.fromEntries(
        comTranscricao.map((d) => [
          d.id,
          { docId: d.id, status: 'transcrito', transcricao_len: d.transcricao?.trim().length ?? 0 } satisfies DocUploadStatus,
        ]),
      ),
    }));

    const semTranscricao = docs.filter((d) => !d.transcricao?.trim() && !!d.caminho_storage);
    if (semTranscricao.length > 0) {
      setIsUploading(true);
      await transcreverEmSerie(semTranscricao);
      setIsUploading(false);
      setPrepStatus({ total: 0, current: 0, failures: [] });
    }

    toast.success(`${docs.length} documento(s) já existente(s) incluído(s) na triagem — sem re-enviar arquivos.`);
  }, [setTriagem, transcreverEmSerie]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleRemoveDoc = useCallback((docId: string) => {
    setTriagem((current) => {
      if (!current) return current;
      return {
        ...current,
        documento_ids: current.documento_ids.filter((id) => id !== docId),
      };
    });
    setUploadStatuses((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  }, [setTriagem]);

  const handleLimparTudo = useCallback(() => {
    setTriagem((current) => {
      if (!current) return null;
      return {
        ...current,
        documento_ids: [],
        sugestoes: [],
      };
    });
    setUploadStatuses({});
    setErrosColagem([]);
    setRespostaColada('');
    toast.info('Documentos da triagem removidos. Você pode subir novamente.');
  }, [setTriagem]);

  // ── Lotes do prompt ────────────────────────────────────────────────────
  const lotes = useMemo(() => {
    if (triagemDocs.length === 0) return [];
    return gerarLotesTriagem({
      itensRSC,
      documentos: triagemDocs,
      ilegiveis: documentosIlegiveis,
      lancamentosExistentes: lancamentosDoServidor,
      documentosDaSessao: documentos,
    });
  }, [triagemDocs, itensRSC, documentosIlegiveis, lancamentosDoServidor, documentos]);

  const totalLotesTriagem = lotes.length;
  const haMultiplosLotesTriagem = totalLotesTriagem > 1;

  // Reinicia o progresso dos lotes sempre que o CONJUNTO de documentos muda
  // (novo upload/remoção altera quantos lotes existem e invalida o progresso anterior).
  // Usa uma chave estável (ids ordenados) em vez de `triagemDocs` diretamente,
  // pois esse array ganha uma referência nova a cada sugestão processada
  // (setTriagem recria o objeto), o que reiniciaria o progresso a cada lote.
  const chaveDocsTriagem = useMemo(
    () => triagemDocs.map((d) => d.id).sort().join(','),
    [triagemDocs],
  );
  useEffect(() => {
    setLoteAtualTriagem(0);
    setUltimoLoteConcluidoTriagem(null);
  }, [chaveDocsTriagem]);

  // ── Colagem da resposta (um lote por vez) ───────────────────────────────
  const handleProcessarResposta = useCallback(() => {
    if (!respostaColada.trim()) {
      toast.error('Cole a resposta da IA primeiro.');
      return;
    }

    const resultado = parseResultadoTriagem(respostaColada, {
      documentos: triagemDocs,
      itensRSC,
    });

    setErrosColagem(resultado.erros);

    setTriagem((current) => ({
      schema_version: 1,
      documento_ids: current?.documento_ids ?? [],
      sugestoes: [...(current?.sugestoes ?? []), ...resultado.sugestoes],
      ultima_colagem_em: new Date().toISOString(),
      erros_ultima_colagem: resultado.erros,
    }));

    if (resultado.erros.length > 0) {
      toast.warning(`${resultado.erros.length} aviso(s) na validação. Verifique abaixo.`);
    }

    const haProximoLoteTriagem = haMultiplosLotesTriagem && loteAtualTriagem < totalLotesTriagem - 1;
    if (haProximoLoteTriagem) {
      const proximo = loteAtualTriagem + 1;
      setUltimoLoteConcluidoTriagem(loteAtualTriagem + 1);
      setLoteAtualTriagem(proximo);
      setRespostaColada('');
      toast.success(
        `Lote ${loteAtualTriagem + 1} de ${totalLotesTriagem} processado (${resultado.sugestoes.length} sugestão(ões)). Copie o prompt do lote ${proximo + 1} de ${totalLotesTriagem}.`,
      );
      return;
    }

    if (resultado.sugestoes.length > 0) {
      toast.success(`${resultado.sugestoes.length} sugestão(ões) processada(s).`);
      setEtapa('revisao');
    } else {
      toast.warning('Nenhuma sugestão válida encontrada na resposta colada.');
    }

    setRespostaColada('');
  }, [respostaColada, triagemDocs, itensRSC, setTriagem, haMultiplosLotesTriagem, loteAtualTriagem, totalLotesTriagem]);

  // ── Preview de pontos ──────────────────────────────────────────────────
  const previewPontos = useCallback((sugestao: SugestaoTriagem): number => {
    if (!sugestao.item_rsc_id) return 0;
    const item = itensRSC.find((i) => i.id === sugestao.item_rsc_id);
    if (!item) return 0;

    if (item.modo_calculo === 'auto_ano_fracao' || item.modo_calculo === 'auto_mes') {
      const dias = totalDiasPeriodos(sugestao.periodos);
      const qtd = item.modo_calculo === 'auto_ano_fracao' ? unidadesAnoFracao(dias) : unidadesMes(dias);
      return calculateLancamentoPoints(qtd, item.pontos_por_unidade);
    }
    // Manual: usa a quantidade informada pela IA quando disponível;
    // senão, cada documento = 1 unidade (Por designação, Por produto, etc.)
    const qtdManual = sugestao.quantidade_sugerida ?? Math.max(1, sugestao.documentos_ids.length);
    return calculateLancamentoPoints(qtdManual, item.pontos_por_unidade);
  }, [itensRSC]);

  // ── Mesclar sugestão a lançamento existente do mesmo item ─────────────
  // Definido antes de `handleConfirmar` porque o guard de quantidade
  // duplicada precisa saber se existe um lançamento-alvo para mesclar.
  const lancamentoExistenteParaMesclar = useCallback((sugestao: SugestaoTriagem) => {
    if (!sugestao.item_rsc_id) return null;
    const candidatos = lancamentosDoServidor.filter(
      (l) => l.item_rsc_id === sugestao.item_rsc_id && l.id !== sugestao.lancamento_id,
    );
    if (candidatos.length === 0) return null;
    // Prefere o lançamento que já compartilha documentos com a sugestão.
    const comDocsEmComum = candidatos.find((l) =>
      getLancamentoDocumentIds(l).some((id) => sugestao.documentos_ids.includes(id)),
    );
    return comDocsEmComum ?? candidatos[0];
  }, [lancamentosDoServidor]);

  // `handleMesclar` é declarado depois de `handleConfirmar` (ele próprio
  // depende de outros callbacks); a ref quebra o ciclo sem reordenar tudo.
  const handleMesclarRef = useRef<((sugestao: SugestaoTriagem) => void) | null>(null);

  // ── Confirmar sugestão ─────────────────────────────────────────────────
  const handleConfirmar = useCallback((sugestao: SugestaoTriagem, editado = false, quantidadeOverride?: number, ignorarAvisoDuplicidade = false, ignorarAvisoQuantidade = false): boolean => {
    if (!sugestao.item_rsc_id || !servidor) return false;

    const item = itensRSC.find((i) => i.id === sugestao.item_rsc_id);
    if (!item) return false;

    // Guarda contra dupla contagem: documentos da sugestão que já sustentam
    // lançamentos existentes (de triagens anteriores ou lançamentos manuais).
    if (!ignorarAvisoDuplicidade && sugestao.documentos_ids.length > 0) {
      const usosExternos = sugestao.documentos_ids.flatMap((id) =>
        (usoDocumentos.get(id) ?? []).filter((u) => u.lancamento.id !== sugestao.lancamento_id),
      );
      const todosJaNoMesmoItem = sugestao.documentos_ids.every((id) =>
        (usoDocumentos.get(id) ?? []).some(
          (u) => u.lancamento.id !== sugestao.lancamento_id && u.lancamento.item_rsc_id === sugestao.item_rsc_id,
        ),
      );

      if (todosJaNoMesmoItem) {
        toast.error(
          'Todos os documentos desta sugestão já pontuam em um lançamento existente deste mesmo item — confirmar criaria um lançamento duplicado. Use "Mesclar ao lançamento existente" para acrescentar períodos ou comprovantes.',
          { duration: 12000 },
        );
        return false;
      }

      if (usosExternos.length > 0) {
        const codigos = codigosItensDosUsos(usosExternos);
        toast.warning(
          `Documento(s) desta sugestão já pontua(m) no(s) item(ns) ${codigos.join(', ')}. O mesmo documento não deve ser contado em duplicidade.`,
          {
            duration: 12000,
            action: {
              label: 'Confirmar mesmo assim',
              onClick: () => { handleConfirmar(sugestao, editado, quantidadeOverride, true); },
            },
          },
        );
        return false;
      }
    }

    // Períodos são persistidos também em itens manuais: documentam as datas
    // reais das designações no dossiê e no prompt de auditoria (sem isso,
    // data_inicio/fim cairiam na data de hoje e induziriam a IA auditora a
    // apontar "período incorreto" em todo lançamento).
    const periodos = sugestao.periodos.filter((p) => periodoValido(p));
    const abrang = abrangenciaPeriodos(periodos);

    let quantidade: number;
    if (item.modo_calculo === 'auto_ano_fracao') {
      quantidade = unidadesAnoFracao(totalDiasPeriodos(periodos));
    } else if (item.modo_calculo === 'auto_mes') {
      quantidade = unidadesMes(totalDiasPeriodos(periodos));
    } else {
      quantidade = quantidadeOverride ?? sugestao.quantidade_sugerida ?? Math.max(1, sugestao.documentos_ids.length);
    }

    const pontos = calculateLancamentoPoints(quantidade, item.pontos_por_unidade);

    // Guard contra dupla contagem de quantidade: se já existe lançamento do
    // mesmo item e a sugestão traz uma quantidade >= à dele sem trazer
    // comprovantes novos suficientes, o mais provável é que a IA tenha
    // repetido o TOTAL do item. O total correto é a soma dos lançamentos —
    // mesclar soma apenas o delta. Aviso dispensável, nunca bloqueio.
    if (!ignorarAvisoQuantidade) {
      const alvo = lancamentoExistenteParaMesclar(sugestao);
      if (
        alvo &&
        deveAvisarQuantidadeDuplicada(item.modo_calculo, [alvo], quantidade, sugestao.documentos_ids.length) &&
        quantidade >= alvo.quantidade_informada
      ) {
        toast.warning(
          `O item ${itemDossierCode(item)} já tem um lançamento com ${formatPointValue(alvo.quantidade_informada)} unidade(s). ` +
          `Esta sugestão declara ${formatPointValue(quantidade)} unidade(s) com apenas ${sugestao.documentos_ids.length} comprovante(s) — ` +
          'confirmar como lançamento novo pode contar as mesmas unidades duas vezes.',
          {
            duration: 14000,
            action: {
              label: 'Mesclar ao lançamento existente',
              onClick: () => { handleMesclarRef.current?.(sugestao); },
            },
            cancel: {
              label: 'Criar novo assim mesmo',
              onClick: () => { handleConfirmar(sugestao, editado, quantidadeOverride, true, true); },
            },
          },
        );
        return false;
      }
    }

    const lancamentoData = {
      servidor_id: servidor.id,
      item_rsc_id: sugestao.item_rsc_id,
      comprovantes_ids: sugestao.documentos_ids,
      periodos: periodos.length > 0 ? periodos : undefined,
      data_inicio: abrang?.inicio ?? new Date().toISOString().slice(0, 10),
      data_fim: abrang?.fim ?? new Date().toISOString().slice(0, 10),
      quantidade_informada: quantidade,
      pontos_calculados: pontos,
    };

    const novoLancamento = addLancamento(lancamentoData);
    atualizarSugestao(sugestao.id, {
      status: editado ? 'editada' : 'confirmada',
      lancamento_id: novoLancamento.id,
    });
    toast.success(`Lançamento criado: +${formatPointValue(pontos)} pts`);
    return true;
  }, [servidor, itensRSC, addLancamento, atualizarSugestao, usoDocumentos, lancamentoExistenteParaMesclar]);

  // ── Confirmar editada ─────────────────────────────────────────────────
  const handleConfirmarEditada = useCallback((sugestao: SugestaoTriagem) => {
    const item = itensRSC.find((i) => i.id === editItemRscId);
    if (!item || !servidor) return;

    const isDateBased = item.modo_calculo === 'auto_ano_fracao' || item.modo_calculo === 'auto_mes';
    // Em itens manuais o diálogo não edita períodos — preserva os da sugestão.
    const periodos = isDateBased ? editPeriodos.filter((p) => p.inicio && p.fim) : sugestao.periodos;
    const qtdManual = isDateBased ? undefined : (parseInt(editQuantidade) || 1);

    const sugestaoEditada: SugestaoTriagem = {
      ...sugestao,
      item_rsc_id: editItemRscId,
      periodos,
    };

    handleConfirmar(sugestaoEditada, true, qtdManual);
    setEditingSugestaoId(null);
  }, [editItemRscId, editPeriodos, editQuantidade, itensRSC, servidor, handleConfirmar]);

  // ── Descartar sugestão ────────────────────────────────────────────────
  const handleDescartar = useCallback((sugestao: SugestaoTriagem) => {
    atualizarSugestao(sugestao.id, { status: 'descartada' });
    toast.info('Sugestão descartada.');
  }, [atualizarSugestao]);

  const handleMesclar = useCallback((sugestao: SugestaoTriagem) => {
    if (!sugestao.item_rsc_id) return;
    const alvo = lancamentoExistenteParaMesclar(sugestao);
    const item = itensRSC.find((i) => i.id === sugestao.item_rsc_id);
    if (!alvo || !item) return;

    const docsAtuais = getLancamentoDocumentIds(alvo);
    const novosDocs = sugestao.documentos_ids.filter((id) => !docsAtuais.includes(id));
    const comprovantes = [...docsAtuais, ...novosDocs];
    const periodos = mesclarPeriodos([
      ...periodosDoLancamento(alvo),
      ...sugestao.periodos.filter(periodoValido),
    ]);

    let quantidade = alvo.quantidade_informada;
    if (item.modo_calculo === 'auto_ano_fracao') {
      quantidade = unidadesAnoFracao(totalDiasPeriodos(periodos));
    } else if (item.modo_calculo === 'auto_mes') {
      quantidade = unidadesMes(totalDiasPeriodos(periodos));
    } else if (novosDocs.length > 0) {
      quantidade = alvo.quantidade_informada + (sugestao.quantidade_sugerida ?? novosDocs.length);
    }

    const pontos = calculateLancamentoPoints(quantidade, item.pontos_por_unidade);
    const abr = abrangenciaPeriodos(periodos);
    const delta = pontos - alvo.pontos_calculados;

    updateLancamento(alvo.id, {
      comprovantes_ids: comprovantes,
      periodos: periodos.length > 0 ? periodos : undefined,
      quantidade_informada: quantidade,
      pontos_calculados: pontos,
      data_inicio: abr?.inicio ?? alvo.data_inicio,
      data_fim: abr?.fim ?? alvo.data_fim,
    });
    atualizarSugestao(sugestao.id, { status: 'confirmada', lancamento_id: alvo.id });
    toast.success(
      `Sugestão mesclada ao lançamento existente do item ${itemDossierCode(item)}: ` +
      `${novosDocs.length} comprovante(s) novo(s), ${delta >= 0 ? '+' : ''}${formatPointValue(delta)} pts.`,
    );
  }, [lancamentoExistenteParaMesclar, itensRSC, updateLancamento, atualizarSugestao]);

  handleMesclarRef.current = handleMesclar;

  // ── Confirmar todas com confiança alta ────────────────────────────────
  const handleConfirmarTodasAltas = useCallback(() => {
    const pendentesAltas = (triagem?.sugestoes ?? []).filter(
      (s) => s.status === 'pendente' && s.confianca === 'alta' && s.item_rsc_id,
    );
    let confirmadas = 0;
    for (const s of pendentesAltas) {
      if (handleConfirmar(s)) confirmadas++;
    }
    const retidas = pendentesAltas.length - confirmadas;
    toast.success(
      `${confirmadas} sugestão(ões) confirmada(s).` +
      (retidas > 0 ? ` ${retidas} retida(s) por possível duplicidade — revise individualmente.` : ''),
    );
  }, [triagem, handleConfirmar]);

  // ── Sugestões agrupadas por item ──────────────────────────────────────
  const sugestoesAgrupadas = useMemo(() => {
    const todas = triagem?.sugestoes ?? [];
    const filtradas = todas.filter((s) => {
      if (filtroStatus === 'todos') return true;
      if (filtroStatus === 'confirmada') return s.status === 'confirmada' || s.status === 'editada';
      return s.status === filtroStatus;
    });
    const grupos = new Map<string, SugestaoTriagem[]>();
    for (const s of filtradas) {
      const key = s.item_rsc_id ?? '__nao_classificavel__';
      const arr = grupos.get(key) ?? [];
      arr.push(s);
      grupos.set(key, arr);
    }
    return Array.from(grupos.entries()).sort((a, b) => {
      if (a[0] === '__nao_classificavel__') return 1;
      if (b[0] === '__nao_classificavel__') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [triagem, filtroStatus]);

  const pendentesCount = (triagem?.sugestoes ?? []).filter((s) => s.status === 'pendente').length;
  const confirmadasCount = (triagem?.sugestoes ?? []).filter((s) => s.status === 'confirmada' || s.status === 'editada').length;
  const descartadasCount = (triagem?.sugestoes ?? []).filter((s) => s.status === 'descartada').length;

  // ── Detecção de documentos duplicados entre sugestões ──────────────────
  const docsDuplicados = useMemo(() => {
    const todas = triagem?.sugestoes ?? [];
    if (todas.length < 2) return new Set<string>();
    const contador = new Map<string, number>();
    for (const s of todas) {
      if (s.status === 'descartada') continue;
      for (const docId of s.documentos_ids) {
        contador.set(docId, (contador.get(docId) ?? 0) + 1);
      }
    }
    return new Set(
      Array.from(contador.entries()).filter(([, count]) => count > 1).map(([docId]) => docId),
    );
  }, [triagem]);

  /** Retorna os documentos de uma sugestão que também aparecem em outras. */
  const duplicadosNaSugestao = useCallback((sugestao: SugestaoTriagem): string[] => {
    if (docsDuplicados.size === 0) return [];
    return sugestao.documentos_ids.filter((id) => docsDuplicados.has(id));
  }, [docsDuplicados]);

  // ── Auditoria IA estruturada ───────────────────────────────────────────
  const nivelPleiteado = useMemo(() => {
    if (!servidor) return null;
    const fromProcesso = processo?.nivel_pleiteado_id
      ? null
      : getEligibleRscLevel(servidor.escolaridade_atual);
    return fromProcesso;
  }, [servidor, processo]);

  const promptAuditoria = useMemo(() => {
    if (!servidor || lancamentosDoServidor.length === 0) return '';
    return gerarPromptAuditoriaEstruturada({
      servidor,
      nivelPleiteado,
      processo,
      lancamentos: lancamentosDoServidor,
      itensRSC,
      documentos,
    });
  }, [servidor, nivelPleiteado, processo, lancamentosDoServidor, itensRSC, documentos]);

  const temIdsDuplicados = useMemo(
    () => new Set(lancamentosDoServidor.map((l) => l.id)).size < lancamentosDoServidor.length,
    [lancamentosDoServidor],
  );

  const handleProcessarRespostaAuditoria = useCallback(() => {
    if (!respostaAuditoria.trim()) {
      toast.error('Cole a resposta da IA primeiro.');
      return;
    }
    const resultado = parseResultadoAuditoria(respostaAuditoria, {
      lancamentos: lancamentosDoServidor,
      itensRSC,
    });
    setErrosAuditoria(resultado.erros);
    importarOperacoesAuditoria('triagem', resultado.operacoes, resultado.erros);
    if (resultado.erros.length > 0) {
      toast.warning(`${resultado.erros.length} aviso(s) na validação.`);
    }
    if (resultado.operacoes.length > 0) {
      toast.success(`${resultado.operacoes.length} operação(ões) enviada(s) para o módulo Auditoria.`);
    } else {
      toast.info('Nenhuma correção proposta pela IA.');
    }
    setRespostaAuditoria('');
    navigate('/auditoria');
  }, [respostaAuditoria, lancamentosDoServidor, itensRSC, importarOperacoesAuditoria, navigate]);


  // ── Stepper visual ─────────────────────────────────────────────────────
  const stepLabels = [
    { key: 'documentos', label: 'Documentos', num: 1 },
    { key: 'analise', label: 'Análise externa', num: 2 },
    { key: 'revisao', label: 'Revisão', num: 3 },
    { key: 'auditoria', label: 'Auditoria IA', num: 4 },
  ] as const;

  return (
    <MainLayout activeView="triagem">
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">Dossiê Inteligente</h1>
              <p className="mt-1 text-sm text-gray-500">
                Carregue os documentos, descubra onde cada um se encaixa, revise as sugestões e faça a auditoria IA — tudo em um fluxo só.
              </p>
              <p className="mt-1 text-xs font-medium text-amber-600">
                Recurso experimental: a IA pode cometer erros ou gerar informações incorretas (alucinações). Utilize com cautela e revise criticamente cada resultado.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setTutorialOpen(true)}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Como funciona
          </Button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {stepLabels.map((step, idx) => (
            <React.Fragment key={step.key}>
              <button
                type="button"
                onClick={() => setEtapa(step.key)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all',
                  etapa === step.key
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200',
                )}
              >
                <span className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-black',
                  etapa === step.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400',
                )}>
                  {step.num}
                </span>
                {step.label}
              </button>
              {idx < stepLabels.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-300" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Etapa 1: Documentos ───────────────────────────────────── */}
        {etapa === 'documentos' && (
          <div className="space-y-4">
            {/* Dropzone */}
            <Card className="border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all',
                    dragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <UploadCloud className={cn('h-10 w-10', dragActive ? 'text-primary' : 'text-gray-300')} />
                  <p className="mt-3 text-sm font-bold text-gray-700">
                    Arraste seus documentos aqui ou clique para selecionar
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    PDF, imagens (JPG, PNG) ou texto — todos os formatos suportados
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Selecionar arquivos
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.txt,.md,.json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) void handleFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>

                {isUploading && (
                  <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    <span className="min-w-0 flex-1 break-all">
                      Transcrevendo documento {prepStatus.current}/{prepStatus.total}
                      {prepStatus.currentName ? ` — ${prepStatus.currentName}` : ''}
                    </span>
                  </div>
                )}

                {prepStatus.failures.length > 0 && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-bold">Falhas na transcrição:</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {prepStatus.failures.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documentos já existentes na sessão — inclui sem re-upload */}
            {docsExistentesForaDaTriagem.length > 0 && (
              <Card className="border-sky-100 bg-sky-50/30 shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-sky-600" />
                      <h3 className="text-sm font-bold text-gray-900">
                        Documentos já no sistema ({docsExistentesForaDaTriagem.length})
                      </h3>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isUploading}
                      onClick={() => void handleIncluirExistentes(docsExistentesForaDaTriagem)}
                      className="text-xs"
                    >
                      <PlusCircle className="mr-1 h-3.5 w-3.5" />
                      Incluir todos na triagem
                    </Button>
                  </div>
                  <p className="mb-3 text-xs text-gray-500">
                    Estes documentos já foram enviados anteriormente (nesta ou em outra triagem). Inclua-os
                    para que a IA os analise junto com os novos — sem re-enviar arquivos nem criar cópias.
                  </p>
                  <div className="space-y-1.5">
                    {docsExistentesForaDaTriagem.map((doc) => {
                      const usos = usoDocumentos.get(doc.id);
                      return (
                        <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-sky-100 bg-white p-2.5">
                          <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-gray-800">{doc.nome_arquivo}</p>
                            {usos && usos.length > 0 && (
                              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                <AlertTriangle className="h-3 w-3" />
                                Já pontua no(s) item(ns) {codigosItensDosUsos(usos).join(', ')}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isUploading}
                            onClick={() => void handleIncluirExistentes([doc])}
                            className="shrink-0 text-xs text-sky-700 hover:bg-sky-50"
                          >
                            <PlusCircle className="mr-1 h-3.5 w-3.5" />
                            Incluir
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de documentos */}
            {triagemDocs.length > 0 && (
              <Card className="border-gray-200 bg-white shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">
                      Documentos enviados ({triagemDocs.length})
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleLimparTudo}
                        disabled={isUploading}
                        className="text-xs text-red-600 hover:bg-red-50 hover:border-red-300"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Limpar tudo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setEtapa('analise')}
                        className="text-xs"
                      >
                        Avançar para análise
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {triagemDocs.map((doc) => {
                      const st = uploadStatuses[doc.id];
                      const isIlegivel = documentosIlegiveis.has(doc.id);
                      const transcLen = doc.transcricao?.trim().length ?? 0;

                      return (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                        >
                          <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-800">{doc.nome_arquivo}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              {st?.status === 'transcrevendo' && (
                                <span className="flex items-center gap-1 text-xs text-blue-600">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Transcrevendo…
                                </span>
                              )}
                              {st?.status === 'transcrito' && !isIlegivel && (
                                <span className="flex items-center gap-1 text-xs text-emerald-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Transcrito ({transcLen} caracteres)
                                </span>
                              )}
                              {isIlegivel && (
                                <span className="flex items-center gap-1 text-xs text-amber-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  Possivelmente ilegível ({transcLen} caracteres)
                                </span>
                              )}
                              {st?.status === 'falha' && (
                                <span className="flex items-center gap-1 text-xs text-red-600">
                                  <AlertCircle className="h-3 w-3" />
                                  Falha: {st.erro}
                                </span>
                              )}
                              {!st && transcLen > 0 && !isIlegivel && (
                                <span className="flex items-center gap-1 text-xs text-emerald-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Transcrito ({transcLen} caracteres)
                                </span>
                              )}
                              {!st && transcLen === 0 && (
                                <span className="text-xs text-gray-400">Pendente</span>
                              )}
                            </div>
                            {(() => {
                              const usos = usoDocumentos.get(doc.id);
                              const iguais = duplicatasConteudo.get(doc.id);
                              if ((!usos || usos.length === 0) && (!iguais || iguais.length === 0)) return null;
                              return (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {usos && usos.length > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                      <AlertTriangle className="h-3 w-3" />
                                      Já pontua no(s) item(ns) {codigosItensDosUsos(usos).join(', ')}
                                    </span>
                                  )}
                                  {iguais && iguais.length > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700" title={iguais.map((d) => d.nome_arquivo).join(', ')}>
                                      <Copy className="h-3 w-3" />
                                      Conteúdo idêntico a {iguais[0].nome_arquivo}{iguais.length > 1 ? ` (+${iguais.length - 1})` : ''}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Remover da triagem"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Etapa 2: Análise externa ────────────────────────────────── */}
        {etapa === 'analise' && (
          <div className="space-y-4">
            {triagemDocs.length === 0 ? (
              <Card className="border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6 text-center text-sm text-gray-500">
                  Nenhum documento enviado. Volte à etapa anterior para subir seus documentos.
                  <div className="mt-4">
                    <Button type="button" variant="outline" onClick={() => setEtapa('documentos')}>
                      Voltar para documentos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Indicador de progresso dos lotes */}
                {haMultiplosLotesTriagem && (
                  <div className="flex items-center gap-2 rounded-full bg-violet-50 py-1 pl-1 pr-3 w-fit">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalLotesTriagem }, (_, i) => i + 1).map((n) => {
                        const concluido = n <= (ultimoLoteConcluidoTriagem ?? 0);
                        const atual = n === loteAtualTriagem + 1;
                        return (
                          <span
                            key={n}
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition-colors ${
                              concluido
                                ? 'bg-emerald-500 text-white'
                                : atual
                                  ? 'bg-violet-600 text-white ring-4 ring-violet-100'
                                  : 'bg-white text-violet-300 border border-violet-100'
                            }`}
                            title={concluido ? `Lote ${n} concluído` : atual ? `Lote ${n} — atual` : `Lote ${n}`}
                          >
                            {concluido ? '✓' : n}
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-violet-700">
                      Lote {loteAtualTriagem + 1} de {totalLotesTriagem}
                    </span>
                  </div>
                )}

                {/* Banner persistente de lote concluído */}
                {ultimoLoteConcluidoTriagem !== null && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      <strong>Lote {ultimoLoteConcluidoTriagem} de {totalLotesTriagem} concluído</strong> — {(triagem?.sugestoes.length ?? 0)} sugestão(ões) capturada(s) até agora. Copie abaixo o prompt do <strong>lote {loteAtualTriagem + 1} de {totalLotesTriagem}</strong> e repita o processo.
                    </p>
                  </div>
                )}

                {/* Prompt do lote atual */}
                {lotes[loteAtualTriagem] && (() => {
                  const lote = lotes[loteAtualTriagem];
                  const idx = loteAtualTriagem;
                  const tokens = estimatePromptTokens(lote.prompt);
                  return (
                    <Card className="border-gray-200 bg-white shadow-sm">
                      <CardContent className="p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-gray-900">
                            {haMultiplosLotesTriagem ? `Prompt — Lote ${lote.indice + 1} de ${lote.total}` : 'Prompt de classificação'}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>~{tokens.toLocaleString('pt-BR')} tokens</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const ta = document.getElementById(`prompt-lote-${idx}`) as HTMLTextAreaElement | null;
                                if (ta) { ta.focus(); ta.select(); }
                              }}
                            >
                              <Clipboard className="mr-1 h-3.5 w-3.5" />
                              Selecionar tudo
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => baixarPromptArquivo(lote.prompt, servidor.siape, lote.indice, lote.total)}
                            >
                              <Download className="mr-1 h-3.5 w-3.5" />
                              Baixar .md
                            </Button>
                          </div>
                        </div>
                        <textarea
                          id={`prompt-lote-${idx}`}
                          readOnly
                          value={lote.prompt}
                          className="h-[30vh] min-h-[200px] w-full resize-none rounded-xl border border-gray-200 bg-gray-950 p-4 font-mono text-xs leading-relaxed text-gray-100 shadow-inner focus:outline-none"
                          onClick={(e) => e.currentTarget.select()}
                        />
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Links IA externa */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-gray-500">Abrir IA externa:</span>
                  <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://gemini.google.com" target="_blank" rel="noreferrer">
                    Gemini <ExternalLink className="h-3 w-3" />
                  </a>
                  <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://claude.ai" target="_blank" rel="noreferrer">
                    Claude <ExternalLink className="h-3 w-3" />
                  </a>
                  <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://chat.openai.com" target="_blank" rel="noreferrer">
                    ChatGPT <ExternalLink className="h-3 w-3" />
                  </a>
                  <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://chat.deepseek.com" target="_blank" rel="noreferrer">
                    DeepSeek <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Orientação ilegíveis */}
                {documentosIlegiveis.size > 0 && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {documentosIlegiveis.size} documento(s) marcado(s) como ilegível. Anexe os arquivos originais
                        diretamente no chat da IA junto com o prompt — ela conseguirá ler os arquivos mesmo sem a transcrição.
                      </span>
                    </p>
                  </div>
                )}

                {/* Área de colagem */}
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="mb-3 text-sm font-bold text-gray-900">
                      {haMultiplosLotesTriagem
                        ? `Cole aqui a resposta da IA para o lote ${loteAtualTriagem + 1} de ${totalLotesTriagem}`
                        : 'Cole aqui a resposta da IA'}
                    </h3>
                    <textarea
                      value={respostaColada}
                      onChange={(e) => setRespostaColada(e.target.value)}
                      placeholder='Cole a resposta JSON da IA aqui. Pode incluir cercas ```json e texto em volta.'
                      className="h-[30vh] min-h-[200px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {respostaColada.trim() && pareceSerPrompt(respostaColada, [lotes[loteAtualTriagem]?.prompt ?? '']) ? (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <p className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>Isso é o <strong>prompt</strong>, não a resposta da IA. Copie o prompt acima, cole-o no chat da IA, aguarde a resposta e cole <strong>a resposta</strong> (o JSON gerado por ela) aqui.</span>
                        </p>
                      </div>
                    ) : respostaColada.trim() && !pareceJson(respostaColada) && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <p className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>O texto colado não parece ser JSON. Verifique se você copiou a resposta da IA (que deve conter <code className="rounded bg-red-100 px-1">{`{ ... }`}</code>) e não o prompt.</span>
                        </p>
                      </div>
                    )}
                    {errosColagem.length > 0 && (
                      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
                        <p className="font-bold">Avisos da última colagem:</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {errosColagem.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEtapa('documentos')}>
                        Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleProcessarResposta}
                        disabled={!respostaColada.trim() || pareceSerPrompt(respostaColada, [lotes[loteAtualTriagem]?.prompt ?? ''])}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {haMultiplosLotesTriagem && loteAtualTriagem < totalLotesTriagem - 1
                          ? `Processar e ir para o lote ${loteAtualTriagem + 2}`
                          : 'Processar resposta'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── Etapa 3: Revisão ────────────────────────────────────────── */}
        {etapa === 'revisao' && (
          <div className="space-y-4">
            {/* Disclaimer */}
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  As sugestões abaixo são preliminares, geradas por IA externa a partir das transcrições.
                  Confira cada uma antes de confirmar — a responsabilidade pelas informações do requerimento é do servidor.
                </span>
              </p>
            </div>

            {/* Progresso + Filtros */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltroStatus('todos')}
                  className={cn(
                    'rounded-full px-3 py-1 font-bold transition-colors',
                    filtroStatus === 'todos' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  Todas ({(triagem?.sugestoes ?? []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatus('pendente')}
                  className={cn(
                    'rounded-full px-3 py-1 font-bold transition-colors',
                    filtroStatus === 'pendente' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  Pendentes ({pendentesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatus('confirmada')}
                  className={cn(
                    'rounded-full px-3 py-1 font-bold transition-colors',
                    filtroStatus === 'confirmada' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                  )}
                >
                  Confirmadas ({confirmadasCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatus('descartada')}
                  className={cn(
                    'rounded-full px-3 py-1 font-bold transition-colors',
                    filtroStatus === 'descartada' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100',
                  )}
                >
                  Descartadas ({descartadasCount})
                </button>
              </div>
              {pendentesCount > 0 && (
                <Button type="button" size="sm" variant="outline" onClick={handleConfirmarTodasAltas}>
                  Confirmar todas com confiança alta
                </Button>
              )}
            </div>

            {/* Sugestões agrupadas */}
            {sugestoesAgrupadas.length === 0 && (triagem?.sugestoes ?? []).length === 0 && (
              <Card className="border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6 text-center text-sm text-gray-500">
                  Nenhuma sugestão disponível. Processe a resposta da IA na etapa anterior.
                  <div className="mt-4">
                    <Button type="button" variant="outline" onClick={() => setEtapa('analise')}>
                      Ir para análise
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {sugestoesAgrupadas.length === 0 && (triagem?.sugestoes ?? []).length > 0 && (
              <Card className="border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6 text-center text-sm text-gray-500">
                  Nenhuma sugestão neste filtro.
                </CardContent>
              </Card>
            )}

            {sugestoesAgrupadas.map(([grupoKey, sugestoes]) => {
              const item = grupoKey !== '__nao_classificavel__' ? itensRSC.find((i) => i.id === grupoKey) : null;
              const grupoLabel = item
                ? `${item.inciso}-${item.numero}: ${item.descricao}`
                : 'Não classificáveis';

              return (
                <div key={grupoKey} className="space-y-2">
                  <h3 className="px-1 text-xs font-black uppercase tracking-wider text-gray-400">
                    {grupoLabel}
                  </h3>
                  {sugestoes.map((sugestao) => {
                    const sugestaoDocs = sugestao.documentos_ids
                      .map((id) => documentos.find((d) => d.id === id))
                      .filter((d): d is Documento => !!d);
                    const pontos = previewPontos(sugestao);
                    const isEditing = editingSugestaoId === sugestao.id;
                    const isDescartada = sugestao.status === 'descartada';

                    return (
                      <Card key={sugestao.id} className={cn(
                        'border shadow-sm transition-all',
                        isDescartada ? 'border-gray-100 bg-gray-50/50 opacity-60' : 'border-gray-200 bg-white',
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                            <div className="min-w-0 flex-1 space-y-2">
                              {/* Linha 1: arquivo(s) + confiança + status */}
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-gray-800">
                                  {sugestaoDocs.length === 1
                                    ? <span className="break-all">{sugestaoDocs[0].nome_arquivo}</span>
                                    : sugestaoDocs.length > 1
                                      ? <span>{sugestaoDocs.length} documentos</span>
                                      : <span className="break-all">{sugestao.documentos_ids.join(', ')}</span>}
                                </p>
                                <span className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                  sugestao.confianca === 'alta' && 'bg-emerald-50 text-emerald-700',
                                  sugestao.confianca === 'media' && 'bg-amber-50 text-amber-700',
                                  sugestao.confianca === 'baixa' && 'bg-gray-100 text-gray-600',
                                )}>
                                  {sugestao.confianca}
                                </span>
                                {sugestao.ja_contemplado && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                    <AlertTriangle className="mr-1 inline h-3 w-3" />IA: já contemplado
                                  </span>
                                )}
                                {sugestao.status === 'confirmada' && (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <CheckCircle className="mr-1 inline h-3 w-3" />Confirmada
                                  </span>
                                )}
                                {sugestao.status === 'editada' && (
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                    <CheckCircle className="mr-1 inline h-3 w-3" />Editada
                                  </span>
                                )}
                                {isDescartada && (
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                                    Descartada
                                  </span>
                                )}
                              </div>

                              {/* Lista de documentos (quando agrupados) */}
                              {sugestaoDocs.length > 1 && (() => {
                                const MAX_PREVIEW = 5;
                                const isExpanded = docsExpandidos.has(sugestao.id);
                                const visibleDocs = isExpanded ? sugestaoDocs : sugestaoDocs.slice(0, MAX_PREVIEW);
                                const hiddenCount = sugestaoDocs.length - MAX_PREVIEW;
                                return (
                                  <ul className="space-y-0.5 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                                    {visibleDocs.map((doc, i) => (
                                      <li key={doc.id} className="flex items-start gap-1.5">
                                        <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                                        <span className="break-all">{doc.nome_arquivo}</span>
                                      </li>
                                    ))}
                                    {hiddenCount > 0 && (
                                      <li>
                                        <button
                                          type="button"
                                          onClick={() => setDocsExpandidos((prev) => { const next = new Set(prev); next.add(sugestao.id); return next; })}
                                          className="flex items-center gap-1 pt-0.5 text-xs font-semibold text-primary hover:underline"
                                        >
                                          <ChevronDown className="h-3 w-3" />
                                          Ver mais {hiddenCount} documento(s)
                                        </button>
                                      </li>
                                    )}
                                    {isExpanded && sugestaoDocs.length > MAX_PREVIEW && (
                                      <li>
                                        <button
                                          type="button"
                                          onClick={() => setDocsExpandidos((prev) => { const next = new Set(prev); next.delete(sugestao.id); return next; })}
                                          className="flex items-center gap-1 pt-0.5 text-xs font-semibold text-primary hover:underline"
                                        >
                                          <ChevronUp className="h-3 w-3" />
                                          Ver menos
                                        </button>
                                      </li>
                                    )}
                                  </ul>
                                );
                              })()}

                              {/* Aviso de documentos duplicados em outras sugestões */}
                              {(() => {
                                const dups = duplicadosNaSugestao(sugestao);
                                if (dups.length === 0) return null;
                                const dupDocs = dups.map((id) => documentos.find((d) => d.id === id)).filter((d): d is Documento => !!d);
                                return (
                                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                                    <p className="flex items-start gap-1.5">
                                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                      <span>
                                        <strong>{dups.length} documento(s) repetido(s)</strong> em outra(s) sugestão(ões):
                                        {dupDocs.slice(0, 3).map((d, i) => (
                                          <span key={d.id} className="ml-1 break-all">{i > 0 && ', '}{d.nome_arquivo}</span>
                                        ))}
                                        {dupDocs.length > 3 && <span className="ml-1">e mais {dupDocs.length - 3}…</span>}
                                        . Verifique se a classificação está correta — o mesmo documento não deve pontuar em itens diferentes.
                                      </span>
                                    </p>
                                  </div>
                                );
                              })()}

                              {/* Aviso de documentos já vinculados a lançamentos existentes */}
                              {(() => {
                                const docsJaLancados = sugestao.documentos_ids
                                  .flatMap((id) => {
                                    const doc = documentos.find((d) => d.id === id);
                                    const usos = (usoDocumentos.get(id) ?? []).filter((u) => u.lancamento.id !== sugestao.lancamento_id);
                                    return doc && usos.length > 0 ? [{ doc, usos }] : [];
                                  });
                                if (docsJaLancados.length === 0) return null;
                                return (
                                  <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-900">
                                    <p className="flex items-start gap-1.5">
                                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                      <span>
                                        <strong>{docsJaLancados.length} documento(s) já pontua(m)</strong> em lançamento(s) existente(s):
                                        {docsJaLancados.slice(0, 3).map((e, i) => (
                                          <span key={e.doc.id} className="ml-1 break-all">
                                            {i > 0 && '; '}{e.doc.nome_arquivo} (item {codigosItensDosUsos(e.usos).join(', ')})
                                          </span>
                                        ))}
                                        {docsJaLancados.length > 3 && <span className="ml-1">e mais {docsJaLancados.length - 3}…</span>}
                                        . Confirmar esta sugestão pode gerar dupla contagem.
                                      </span>
                                    </p>
                                  </div>
                                );
                              })()}

                              {/* Sobreposição de períodos com lançamento existente do mesmo item */}
                              {(() => {
                                if (!sugestao.item_rsc_id || sugestao.periodos.length === 0) return null;
                                const itemSug = itensRSC.find((i) => i.id === sugestao.item_rsc_id);
                                const isDateBased = itemSug?.modo_calculo === 'auto_ano_fracao' || itemSug?.modo_calculo === 'auto_mes';
                                if (!isDateBased) return null;
                                const periodosExistentes = lancamentosDoServidor
                                  .filter((l) => l.item_rsc_id === sugestao.item_rsc_id && l.id !== sugestao.lancamento_id)
                                  .flatMap((l) => periodosDoLancamento(l));
                                if (periodosExistentes.length === 0) return null;
                                const sobreposicao = intersecaoPeriodos(sugestao.periodos, periodosExistentes);
                                if (sobreposicao.length === 0) return null;
                                return (
                                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                                    <p className="flex items-start gap-1.5">
                                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                      <span>
                                        <strong>Período(s) já coberto(s)</strong> por lançamento existente deste item:{' '}
                                        {sobreposicao.map((p) => `${p.inicio} a ${p.fim}`).join('; ')}.
                                        Tempo sobreposto não conta em dobro — prefira mesclar ao lançamento existente.
                                      </span>
                                    </p>
                                  </div>
                                );
                              })()}

                              {sugestao.periodos.length > 0 && (() => {
                                const item = sugestao.item_rsc_id ? itensRSC.find((i) => i.id === sugestao.item_rsc_id) : null;
                                const isDateBased = item?.modo_calculo === 'auto_ano_fracao' || item?.modo_calculo === 'auto_mes';
                                if (!isDateBased) return null;
                                return (
                                  <p className="text-xs text-gray-500">
                                    Períodos: {sugestao.periodos.map((p) => `${p.inicio} a ${p.fim}`).join('; ')}
                                  </p>
                                );
                              })()}

                              {/* Justificativa */}
                              <p className="text-xs text-gray-600">
                                <span className="font-semibold">Justificativa:</span> {sugestao.justificativa}
                              </p>

                              {/* Observações */}
                              {sugestao.observacoes && (
                                <p className="text-xs text-gray-500">
                                  <span className="font-semibold">Observações:</span> {sugestao.observacoes}
                                </p>
                              )}

                              {/* Preview de pontos */}
                              {sugestao.item_rsc_id && (
                                <p className="text-sm font-black text-primary">
                                  +{formatPointValue(pontos)} pts (preview)
                                </p>
                              )}

                              {/* Edição inline */}
                              {isEditing && (
                                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-3">
                                  <div>
                                    <label className="text-xs font-bold text-gray-700">Item do catálogo</label>
                                    <select
                                      value={editItemRscId}
                                      onChange={(e) => setEditItemRscId(e.target.value)}
                                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                                    >
                                      <option value="">— Selecione —</option>
                                      {itensRSC.map((i) => (
                                        <option key={i.id} value={i.id}>
                                          {i.inciso}-{i.numero}: {i.descricao}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  {(() => {
                                    const editItem = itensRSC.find((i) => i.id === editItemRscId);
                                    const isDateBased = editItem?.modo_calculo === 'auto_ano_fracao' || editItem?.modo_calculo === 'auto_mes';
                                    if (!isDateBased) {
                                      return (
                                        <div>
                                          <label className="text-xs font-bold text-gray-700">
                                            Quantidade de {editItem?.unidade_medida ?? 'unidades'}
                                          </label>
                                          <p className="mt-0.5 text-[11px] text-gray-500">
                                            {sugestao.documentos_ids.length} documento(s) neste grupo. Ajuste se necessário.
                                          </p>
                                          <input
                                            type="number"
                                            min="1"
                                            value={editQuantidade}
                                            onChange={(e) => setEditQuantidade(e.target.value)}
                                            className="mt-1 w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                                          />
                                        </div>
                                      );
                                    }
                                    return (
                                      <div>
                                        <label className="text-xs font-bold text-gray-700">Períodos</label>
                                        {editPeriodos.map((p, pi) => (
                                          <div key={pi} className="mt-1 flex gap-2">
                                            <input
                                              type="date"
                                              value={p.inicio}
                                              onChange={(e) => setEditPeriodos((prev) => prev.map((x, xi) => xi === pi ? { ...x, inicio: e.target.value } : x))}
                                              className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
                                            />
                                            <input
                                              type="date"
                                              value={p.fim}
                                              onChange={(e) => setEditPeriodos((prev) => prev.map((x, xi) => xi === pi ? { ...x, fim: e.target.value } : x))}
                                              className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
                                            />
                                            {editPeriodos.length > 1 && (
                                              <button onClick={() => setEditPeriodos((prev) => prev.filter((_, xi) => xi !== pi))} className="text-red-400 hover:text-red-600">
                                                <X className="h-4 w-4" />
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                        <button
                                          onClick={() => setEditPeriodos((prev) => [...prev, { inicio: '', fim: '' }])}
                                          className="mt-1 text-xs font-bold text-primary hover:underline"
                                        >
                                          + Adicionar período
                                        </button>
                                      </div>
                                    );
                                  })()}
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setEditingSugestaoId(null)}>
                                      Cancelar
                                    </Button>
                                    <Button size="sm" onClick={() => handleConfirmarEditada(sugestao)}>
                                      Confirmar editada
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Ações */}
                              {!isEditing && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {sugestaoDocs.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewDoc(sugestaoDocs[0])}
                                    >
                                      <Eye className="mr-1 h-3.5 w-3.5" />
                                      Visualizar{sugestaoDocs.length > 1 ? ` (1 de ${sugestaoDocs.length})` : ''}
                                    </Button>
                                  )}
                                  {sugestao.status === 'pendente' && sugestao.item_rsc_id && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleConfirmar(sugestao)}
                                      >
                                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                        Confirmar
                                      </Button>
                                      {lancamentoExistenteParaMesclar(sugestao) && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleMesclar(sugestao)}
                                          title="Adiciona os comprovantes e períodos desta sugestão ao lançamento já existente deste item, em vez de criar um novo lançamento."
                                        >
                                          <GitMerge className="mr-1 h-3.5 w-3.5" />
                                          Mesclar ao lançamento existente
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingSugestaoId(sugestao.id);
                                          setEditItemRscId(sugestao.item_rsc_id ?? '');
                                          setEditPeriodos(sugestao.periodos.length > 0 ? [...sugestao.periodos] : [{ inicio: '', fim: '' }]);
                                          setEditQuantidade(String(sugestao.quantidade_sugerida ?? (sugestao.documentos_ids.length || 1)));
                                        }}
                                      >
                                        <PencilLine className="mr-1 h-3.5 w-3.5" />
                                        Editar e confirmar
                                      </Button>
                                    </>
                                  )}
                                  {sugestao.status === 'pendente' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDescartar(sugestao)}
                                    >
                                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                                      Descartar
                                    </Button>
                                  )}
                                </div>
                              )}

                              {isDescartada && (
                                <div className="pt-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => atualizarSugestao(sugestao.id, { status: 'pendente' })}
                                  >
                                    Restaurar
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })}

            {/* Pós-triagem */}
            {pendentesCount === 0 && (triagem?.sugestoes ?? []).length > 0 && (
              <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                  <h3 className="mt-3 text-lg font-bold text-gray-900">Triagem concluída!</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {confirmadasCount} lançamento(s) criado(s). {descartadasCount} sugestão(ões) descartada(s).
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button onClick={() => navigate('/dashboard')}>
                      Ir para o Dashboard
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                    {lancamentosDoServidor.length > 0 && (
                      <Button variant="outline" onClick={() => setEtapa('auditoria')}>
                        <ShieldCheck className="mr-1 h-4 w-4" />
                        Auditoria IA
                      </Button>
                    )}
                    <Button variant="outline" onClick={limparTriagem}>
                      Novo dossiê
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {triagem && (triagem.sugestoes.length === 0 || pendentesCount > 0) && (
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setEtapa('analise')}>
                  Voltar para análise
                </Button>
                {(triagem?.sugestoes ?? []).length > 0 && (
                  <Button variant="outline" onClick={limparTriagem}>
                    Novo dossiê
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Etapa 4: Auditoria IA estruturada ──────────────────────── */}
        {etapa === 'auditoria' && (
          <div className="space-y-4">
            {lancamentosDoServidor.length === 0 ? (
              <Card className="border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6 text-center text-sm text-gray-500">
                  Você ainda não tem lançamentos. Complete a triagem e revisão primeiro.
                  <div className="mt-4">
                    <Button type="button" variant="outline" onClick={() => setEtapa('documentos')}>
                      Voltar para documentos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Prompt de auditoria */}
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-900">
                        Prompt de auditoria estruturada
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>~{promptAuditoria ? estimatePromptTokens(promptAuditoria).toLocaleString('pt-BR') : 0} tokens</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const ta = document.getElementById('prompt-auditoria') as HTMLTextAreaElement | null;
                            if (ta) { ta.focus(); ta.select(); }
                          }}
                        >
                          <Clipboard className="mr-1 h-3.5 w-3.5" />
                          Selecionar tudo
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => baixarPromptArquivo(promptAuditoria, servidor.siape, 0, 1)}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Baixar .md
                        </Button>
                      </div>
                    </div>
                    {temIdsDuplicados && (
                      <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-900">
                        <p className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            Há lançamentos com identificadores duplicados nesta sessão — a auditoria não
                            conseguiria atribuir as correções ao lançamento certo. Recarregue a página para
                            corrigir os identificadores automaticamente e gere este prompt novamente.
                          </span>
                        </p>
                      </div>
                    )}
                    {promptAuditoria && excedeLimiteTokens(promptAuditoria) && (
                      <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
                        <p className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            Este prompt é grande ({estimatePromptTokens(promptAuditoria).toLocaleString('pt-BR')} tokens estimados).
                            Recomendamos usar um modelo de contexto longo (Gemini 2.5 Pro, Claude Sonnet, etc.).
                          </span>
                        </p>
                      </div>
                    )}
                    <textarea
                      id="prompt-auditoria"
                      readOnly
                      value={promptAuditoria}
                      className="h-[30vh] min-h-[200px] w-full resize-none rounded-xl border border-gray-200 bg-gray-950 p-4 font-mono text-xs leading-relaxed text-gray-100 shadow-inner focus:outline-none"
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </CardContent>
                </Card>

                {/* Links IA externa */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-gray-500">Abrir IA externa:</span>
                  <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://gemini.google.com" target="_blank" rel="noreferrer">
                    Gemini <ExternalLink className="h-3 w-3" />
                  </a>
                  <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://claude.ai" target="_blank" rel="noreferrer">
                    Claude <ExternalLink className="h-3 w-3" />
                  </a>
                  <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://chat.openai.com" target="_blank" rel="noreferrer">
                    ChatGPT <ExternalLink className="h-3 w-3" />
                  </a>
                  <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://chat.deepseek.com" target="_blank" rel="noreferrer">
                    DeepSeek <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Área de colagem */}
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="mb-3 text-sm font-bold text-gray-900">Cole aqui a resposta da IA</h3>
                    <textarea
                      value={respostaAuditoria}
                      onChange={(e) => setRespostaAuditoria(e.target.value)}
                      placeholder='Cole a resposta JSON da IA aqui. Pode incluir cercas ```json e texto em volta.'
                      className="h-[30vh] min-h-[200px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {respostaAuditoria.trim() && pareceSerPrompt(respostaAuditoria, promptAuditoria) ? (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <p className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>Isso é o <strong>prompt</strong>, não a resposta da IA. Copie o prompt acima, cole-o no chat da IA, aguarde a resposta e cole <strong>a resposta</strong> (o JSON gerado por ela) aqui.</span>
                        </p>
                      </div>
                    ) : respostaAuditoria.trim() && !pareceJson(respostaAuditoria) && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <p className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>O texto colado não parece ser JSON. Verifique se você copiou a resposta da IA (que deve conter <code className="rounded bg-red-100 px-1">{`{ ... }`}</code>) e não o prompt.</span>
                        </p>
                      </div>
                    )}
                    {errosAuditoria.length > 0 && (
                      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
                        <p className="font-bold">Avisos da última colagem:</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {errosAuditoria.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEtapa('revisao')}>
                        Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleProcessarRespostaAuditoria}
                        disabled={!respostaAuditoria.trim() || pareceSerPrompt(respostaAuditoria, promptAuditoria)}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Processar e enviar à Auditoria
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

      </div>

      {/* Modal de visualização de documento */}
      {viewerDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewerDoc(null)}
        >
          <div
            className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{viewerDoc.nome_arquivo}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewerDoc(null)}
                className="ml-3 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50">
              {viewerLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : viewerError ? (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-600">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  {viewerError}
                </div>
              ) : viewerUrl ? (
                <iframe
                  src={viewerUrl}
                  title={viewerDoc.nome_arquivo}
                  className="h-full w-full border-0 bg-white"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}

      <DossieTutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </MainLayout>
  );
}
