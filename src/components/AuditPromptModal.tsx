import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Clipboard, Download, ExternalLink, FileText, Loader2, X, CheckCircle2, CircleDot, ChevronLeft, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import { estimatePromptTokens, gerarPromptAuditoriaConsolidada } from '../lib/auditPrompt';
import { gerarPromptMemorial } from '../lib/memorialPrompt';
import { gerarPromptAuditoriaEstruturada } from '../lib/auditoriaPrompt';
import { parseResultadoAuditoria } from '../lib/auditoriaParser';
import { pareceSerPrompt } from '../lib/jsonDetect';
import type { OperacaoAuditoria, TipoOperacao } from '../data/auditoria';
import { getLancamentoDocumentIds, itemDossierCode } from '../lib/documentOrdering';
import { needsTranscription, transcribeDocument, type PrepStatus } from '../lib/transcricao';
import { calculateLancamentoPoints } from '../lib/points';
import { periodosDoLancamento, totalDiasPeriodos, unidadesAnoFracao, unidadesMes, abrangenciaPeriodos } from '../lib/periodos';
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
  removeLancamento?: (id: string) => boolean;
  updateLancamento?: (id: string, updates: Partial<Omit<Lancamento, 'id'>>) => boolean;
  mode?: 'audit' | 'memorial';
};

function downloadTextFile(prompt: string, servidor: Servidor, mode: 'audit' | 'memorial') {
  const siape = servidor.siape.replace(/\D/g, '') || 'servidor';
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `prompt-${mode === 'memorial' ? 'memorial' : 'auditoria'}-rsc-${siape}-${date}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const SEVERIDADE_LABEL: Record<string, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const SEVERIDADE_CLASS: Record<string, string> = {
  alta: 'bg-red-50 text-red-700 border-red-200',
  media: 'bg-amber-50 text-amber-700 border-amber-200',
  baixa: 'bg-blue-50 text-blue-700 border-blue-200',
};

const TIPO_LABEL: Record<string, string> = {
  remover_lancamento: 'Remover lançamento',
  reclassificar: 'Reclassificar',
  ajustar_periodos: 'Ajustar períodos',
  ajustar_quantidade: 'Ajustar quantidade',
  sinalizar: 'Sinalizar',
};

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
  removeLancamento,
  updateLancamento,
  mode = 'audit',
}: Props) {
  const isAudit = mode === 'audit';
  const [fase, setFase] = useState<'prompt' | 'resposta' | 'operacoes'>('prompt');
  const [preparedDocs, setPreparedDocs] = useState<Documento[]>(documentos);
  const [prompt, setPrompt] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [status, setStatus] = useState<PrepStatus>({ total: 0, current: 0, failures: [] });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Audit response phase state
  const [respostaIA, setRespostaIA] = useState('');
  const [operacoes, setOperacoes] = useState<OperacaoAuditoria[]>([]);
  const [errosResposta, setErrosResposta] = useState<string[]>([]);
  const [aplicandoOps, setAplicandoOps] = useState(false);

  const usedDocumentIds = useMemo(
    () => new Set(lancamentos.flatMap(getLancamentoDocumentIds)),
    [lancamentos],
  );

  const promptTokens = estimatePromptTokens(prompt);
  const promptChars = prompt.length;

  // Reset fases ao abrir
  useEffect(() => {
    if (open) {
      setFase('prompt');
      setRespostaIA('');
      setOperacoes([]);
      setErrosResposta([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function prepare() {
      setIsPreparing(true);
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
      const promptParams = {
        servidor,
        nivelPleiteado,
        processo,
        lancamentos,
        itensRSC,
        documentos: nextDocs,
      };
      const nextPrompt = mode === 'memorial'
        ? gerarPromptMemorial(promptParams)
        : isAudit
          ? gerarPromptAuditoriaEstruturada({ ...promptParams, nivelPleiteado: nivelPleiteado as any })
          : gerarPromptAuditoriaConsolidada(promptParams);

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

  const handleSelectAll = () => {
    const textarea = textareaRef.current;
    if (!textarea || !prompt) return;
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    toast.info('Prompt selecionado. Use Ctrl+C ou clique com o botão direito e copie.');
  };

  const handleProcessarResposta = useCallback(() => {
    if (!respostaIA.trim()) {
      toast.error('Cole a resposta da IA primeiro.');
      return;
    }
    const resultado = parseResultadoAuditoria(respostaIA, {
      lancamentos,
      itensRSC,
    });
    setErrosResposta(resultado.erros);
    setOperacoes(resultado.operacoes);
    if (resultado.operacoes.length > 0) {
      toast.success(`${resultado.operacoes.length} operação(ões) processada(s).`);
      setFase('operacoes');
    } else {
      toast.info('Nenhuma operação encontrada — o processo parece estar em ordem.');
      setFase('operacoes');
    }
    if (resultado.erros.length > 0) {
      toast.warning(`${resultado.erros.length} aviso(s) na validação.`);
    }
  }, [respostaIA, lancamentos, itensRSC]);

  const toggleOperacaoStatus = useCallback((id: string, status: 'aprovada' | 'rejeitada') => {
    setOperacoes((prev) => prev.map((op) => (op.id === id ? { ...op, status } : op)));
  }, []);

  const opsPendentes = operacoes.filter((o) => o.status === 'pendente').length;
  const opsAprovadas = operacoes.filter((o) => o.status === 'aprovada').length;
  const opsRejeitadas = operacoes.filter((o) => o.status === 'rejeitada').length;

  const handleAplicarOperacoes = useCallback(() => {
    if (!removeLancamento || !updateLancamento) {
      toast.error('Funções de edição não disponíveis.');
      return;
    }
    const aprovadas = operacoes.filter((o) => o.status === 'aprovada');
    if (aprovadas.length === 0) {
      toast.info('Nenhuma operação aprovada para aplicar.');
      return;
    }
    setAplicandoOps(true);
    let aplicadas = 0;
    let puladas = 0;
    const ordem: TipoOperacao[] = ['remover_lancamento', 'reclassificar', 'ajustar_periodos', 'ajustar_quantidade'];

    for (const tipo of ordem) {
      const opsDoTipo = aprovadas.filter((o) => o.tipo === tipo);
      for (const op of opsDoTipo) {
        const lanc = lancamentos.find((l) => l.id === op.lancamento_id);
        if (!lanc) { puladas++; continue; }
        if (tipo === 'remover_lancamento') {
          removeLancamento(op.lancamento_id);
          aplicadas++;
        } else if (tipo === 'reclassificar' && op.novo_item_rsc_id) {
          const novoItem = itensRSC.find((i) => i.id === op.novo_item_rsc_id);
          if (!novoItem) { puladas++; continue; }
          let periodos = op.novos_periodos ?? periodosDoLancamento(lanc);
          let quantidade = op.nova_quantidade ?? lanc.quantidade_informada;
          if (novoItem.modo_calculo !== 'manual') {
            const dias = totalDiasPeriodos(periodos);
            quantidade = novoItem.modo_calculo === 'auto_mes' ? unidadesMes(dias) : unidadesAnoFracao(dias);
          }
          const abr = abrangenciaPeriodos(periodos);
          const pontos = calculateLancamentoPoints(quantidade, novoItem.pontos_por_unidade);
          updateLancamento(op.lancamento_id, {
            item_rsc_id: op.novo_item_rsc_id,
            periodos,
            quantidade_informada: quantidade,
            pontos_calculados: pontos,
            data_inicio: abr?.inicio ?? lanc.data_inicio,
            data_fim: abr?.fim ?? lanc.data_fim,
          });
          aplicadas++;
        } else if (tipo === 'ajustar_periodos' && op.novos_periodos) {
          const item = itensRSC.find((i) => i.id === lanc.item_rsc_id);
          const periodos = op.novos_periodos;
          const dias = totalDiasPeriodos(periodos);
          let quantidade = lanc.quantidade_informada;
          if (item && item.modo_calculo !== 'manual') {
            quantidade = item.modo_calculo === 'auto_mes' ? unidadesMes(dias) : unidadesAnoFracao(dias);
          }
          const abr = abrangenciaPeriodos(periodos);
          const pontos = item ? calculateLancamentoPoints(quantidade, item.pontos_por_unidade) : lanc.pontos_calculados;
          updateLancamento(op.lancamento_id, {
            periodos,
            quantidade_informada: quantidade,
            pontos_calculados: pontos,
            data_inicio: abr?.inicio ?? lanc.data_inicio,
            data_fim: abr?.fim ?? lanc.data_fim,
          });
          aplicadas++;
        } else if (tipo === 'ajustar_quantidade' && op.nova_quantidade !== undefined) {
          const item = itensRSC.find((i) => i.id === lanc.item_rsc_id);
          const pontos = item ? calculateLancamentoPoints(op.nova_quantidade, item.pontos_por_unidade) : lanc.pontos_calculados;
          updateLancamento(op.lancamento_id, {
            quantidade_informada: op.nova_quantidade,
            pontos_calculados: pontos,
          });
          aplicadas++;
        }
      }
    }
    // Marcar sinalizar como rejeitada
    setOperacoes((prev) => prev.map((op) => op.tipo === 'sinalizar' && op.status === 'aprovada' ? { ...op, status: 'rejeitada' as const } : op));
    setAplicandoOps(false);
    toast.success(`${aplicadas} operação(ões) aplicada(s), ${puladas} pulada(s).`);
  }, [operacoes, lancamentos, itensRSC, removeLancamento, updateLancamento]);

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
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <FileText className="h-5 w-5" />
            </div>
            <h2 id="audit-prompt-title" className="text-lg font-black tracking-tight text-gray-900">
              {mode === 'memorial' ? 'Minuta de memorial via IA' : 'Auditoria semântica via IA'}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">
              {mode === 'memorial'
                ? 'O sistema prepara as transcrições disponíveis e gera um comando para a IA redigir uma base narrativa. Depois, revise o resultado e cole a versão final no campo de Memorial do sistema.'
                : 'O sistema prepara as transcrições e gera um prompt estruturado para a IA auditar os lançamentos. Copie o prompt, envie para uma IA externa, cole a resposta em JSON e aplique as correções.'}
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

        {/* Fase indicator (audit mode only) */}
        {isAudit && (
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-2.5 sm:px-6">
            {[
              { key: 'prompt', label: '1. Copiar prompt', num: 1 },
              { key: 'resposta', label: '2. Colar resposta', num: 2 },
              { key: 'operacoes', label: '3. Revisar operações', num: 3 },
            ].map((s, idx) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${fase === s.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {s.num}
                </span>
                <span className={`text-xs font-bold ${fase === s.key ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
                {idx < 2 && <span className="text-gray-200">→</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {/* ── Fase: PROMPT ─────────────────────────────────────── */}
          {fase === 'prompt' && (
            <>
              <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Privacidade/LGPD: o prompt contém dados pessoais e conteúdo dos comprovantes. Use uma IA adequada ao contexto institucional e, quando possível, desative histórico ou treinamento da conversa.
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
                  <p className="font-bold uppercase tracking-wider text-gray-400">Preparação</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {isPreparing ? `${status.current}/${status.total} documento(s)` : 'Concluída'}
                  </p>
                  <p className="truncate text-gray-500">{status.currentName ?? `${missingTextCount} sem texto local`}</p>
                </div>
              </div>

              {promptTokens > 30000 && (
                <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                  {'Prompt extenso. Para melhor resultado, prefira modelos com contexto longo. Use "Selecionar tudo" e copie com Ctrl+C ou pelo botão direito do mouse. Se preferir, baixe o TXT.'}
                </div>
              )}

              {status.failures.length > 0 && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-bold">{'Alguns documentos não puderam ser transcritos automaticamente:'}</p>
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
            </>
          )}

          {/* ── Fase: RESPOSTA ───────────────────────────────────── */}
          {fase === 'resposta' && (
            <>
              <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <div className="flex gap-2">
                  <Clipboard className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Cole aqui a resposta JSON da IA. O sistema vai validar e extrair as operações de correção.
                  </p>
                </div>
              </div>

              <textarea
                value={respostaIA}
                onChange={(e) => setRespostaIA(e.target.value)}
                placeholder='{"schema_version": 1, "operacoes": [...] }'
                className="h-[42vh] min-h-[320px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-800 shadow-inner focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
              />

              {respostaIA.trim() && pareceSerPrompt(respostaIA, prompt) && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Isso é o <strong>prompt</strong>, não a resposta da IA. Copie o prompt acima, cole-o no chat da IA, aguarde a resposta e cole <strong>a resposta</strong> (o JSON gerado por ela) aqui.</span>
                  </p>
                </div>
              )}

              {errosResposta.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-bold">Avisos na validação:</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5">
                    {errosResposta.map((erro, i) => (
                      <li key={i}>{erro}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFase('prompt')}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Voltar ao prompt
                </Button>
              </div>
            </>
          )}

          {/* ── Fase: OPERAÇÕES ──────────────────────────────────── */}
          {fase === 'operacoes' && (
            <>
              {/* Resumo */}
              <div className="mb-4 flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs font-bold">
                <span className="text-gray-600">Total: <span className="text-gray-900">{operacoes.length}</span></span>
                <span className="text-gray-300">|</span>
                <span className="text-emerald-600">Aprovadas: {opsAprovadas}</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">Rejeitadas: {opsRejeitadas}</span>
                <span className="text-gray-300">|</span>
                <span className="text-amber-600">Pendentes: {opsPendentes}</span>
              </div>

              {errosResposta.length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-bold">Avisos na validação:</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5">
                    {errosResposta.map((erro, i) => (
                      <li key={i}>{erro}</li>
                    ))}
                  </ul>
                </div>
              )}

              {operacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <p className="text-sm font-bold text-gray-700">Nenhuma operação detectada.</p>
                  <p className="text-xs text-gray-400">A IA não identificou correções necessárias, ou a resposta não continha operações válidas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {operacoes.map((op) => {
                    const lanc = lancamentos.find((l) => l.id === op.lancamento_id);
                    const item = lanc ? itensRSC.find((i) => i.id === lanc.item_rsc_id) : null;
                    return (
                      <div
                        key={op.id}
                        className={`rounded-xl border p-4 transition-all ${
                          op.status === 'aprovada' ? 'border-emerald-200 bg-emerald-50/30'
                          : op.status === 'rejeitada' ? 'border-gray-100 bg-gray-50/30 opacity-60'
                          : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${SEVERIDADE_CLASS[op.severidade] ?? SEVERIDADE_CLASS.baixa}`}>
                                {SEVERIDADE_LABEL[op.severidade] ?? op.severidade}
                              </span>
                              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                                {TIPO_LABEL[op.tipo] ?? op.tipo}
                              </span>
                              {item && (
                                <span className="truncate text-xs font-bold text-gray-700">
                                  {itemDossierCode(item)} — {item.descricao.slice(0, 60)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed text-gray-600">{op.justificativa}</p>

                            {/* Detalhes da operação */}
                            <div className="mt-2 rounded-lg bg-gray-50 p-2 text-[11px] text-gray-500">
                              {op.tipo === 'remover_lancamento' && <p>Este lançamento será removido.</p>}
                              {op.tipo === 'reclassificar' && op.novo_item_rsc_id && (
                                <p>Reclassificar para: <strong>{op.novo_item_rsc_id}</strong>
                                  {op.novos_periodos && ` · ${op.novos_periodos.length} período(s)`}
                                  {op.nova_quantidade !== undefined && ` · qtd: ${op.nova_quantidade}`}
                                </p>
                              )}
                              {op.tipo === 'ajustar_periodos' && op.novos_periodos && (
                                <p>Novos períodos: {op.novos_periodos.map(p => `${p.inicio} a ${p.fim}`).join('; ')}</p>
                              )}
                              {op.tipo === 'ajustar_quantidade' && op.nova_quantidade !== undefined && (
                                <p>Nova quantidade: <strong>{op.nova_quantidade}</strong></p>
                              )}
                              {op.tipo === 'sinalizar' && op.descricao && (
                                <p>{op.descricao}</p>
                              )}
                            </div>
                          </div>

                          {/* Aprovar / Rejeitar */}
                          <div className="flex shrink-0 gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleOperacaoStatus(op.id, 'aprovada')}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                                op.status === 'aprovada'
                                  ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                                  : 'border-gray-200 bg-white text-gray-400 hover:border-emerald-200 hover:text-emerald-600'
                              }`}
                              title="Aprovar"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleOperacaoStatus(op.id, 'rejeitada')}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                                op.status === 'rejeitada'
                                  ? 'border-red-300 bg-red-100 text-red-700'
                                  : 'border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:text-red-600'
                              }`}
                              title="Rejeitar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setFase('resposta'); setOperacoes([]); setErrosResposta([]); }}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Colar nova resposta
                </Button>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {/* Fase: prompt */}
          {fase === 'prompt' && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600">
                  {isAudit
                    ? 'Copie o prompt, envie à IA externa e cole a resposta JSON na próxima etapa.'
                    : 'Depois de selecionar, copie com Ctrl+C ou clique com o botão direito e escolha Copiar.'}
                </p>
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
                  <a className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:text-primary" href="https://chat.deepseek.com" target="_blank" rel="noreferrer">
                    DeepSeek <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadTextFile(prompt, servidor, mode)}
                  disabled={isPreparing || !prompt}
                  className="h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar TXT
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectAll}
                  disabled={isPreparing || !prompt}
                  className="h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest"
                >
                  <Clipboard className="mr-2 h-4 w-4" />
                  Selecionar tudo
                </Button>
                {isAudit && (
                  <Button
                    type="button"
                    onClick={() => setFase('resposta')}
                    disabled={isPreparing || !prompt}
                    className="h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest"
                  >
                    Já copiei — colar resposta
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Fase: resposta */}
          {fase === 'resposta' && (
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleProcessarResposta}
                disabled={!respostaIA.trim() || pareceSerPrompt(respostaIA, prompt)}
                className="h-10 rounded-xl px-6 text-xs font-black uppercase tracking-widest"
              >
                <Wrench className="mr-2 h-4 w-4" />
                Processar resposta
              </Button>
            </div>
          )}

          {/* Fase: operações */}
          {fase === 'operacoes' && (
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleAplicarOperacoes}
                disabled={aplicandoOps || opsAprovadas === 0 || !removeLancamento || !updateLancamento}
                className="h-10 rounded-xl px-6 text-xs font-black uppercase tracking-widest"
              >
                {aplicandoOps ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Aplicar {opsAprovadas > 0 ? `(${opsAprovadas})` : ''}
              </Button>
            </div>
          )}

          {/* Memorial mode (no phases) */}
          {!isAudit && fase === 'prompt' && null}
        </div>
      </div>
    </div>
  );
}
