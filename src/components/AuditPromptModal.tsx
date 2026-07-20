import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clipboard, Download, ExternalLink, FileText, X, ChevronLeft, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import { estimatePromptTokens } from '../lib/auditPrompt';
import { gerarPromptMemorial } from '../lib/memorialPrompt';
import { gerarLotesAuditoria, type LoteAuditoria } from '../lib/auditoriaPrompt';
import { parseResultadoAuditoria } from '../lib/auditoriaParser';
import { pareceSerPrompt } from '../lib/jsonDetect';
import type { OperacaoParseada } from '../data/auditoria';
import { getLancamentoDocumentIds } from '../lib/documentOrdering';
import { needsTranscription, transcribeDocument, type PrepStatus } from '../lib/transcricao';
import { useAppContext } from '../context/AppContext';
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
  mode?: 'audit' | 'memorial';
};

function downloadTextFile(prompt: string, servidor: Servidor, mode: 'audit' | 'memorial', loteSuffix?: string) {
  const siape = servidor.siape.replace(/\D/g, '') || 'servidor';
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `prompt-${mode === 'memorial' ? 'memorial' : 'auditoria'}-rsc-${siape}-${date}${loteSuffix ? `-${loteSuffix}` : ''}.txt`;
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
  mode = 'audit',
}: Props) {
  const isAudit = mode === 'audit';
  const navigate = useNavigate();
  const { importarOperacoesAuditoria } = useAppContext();
  const [fase, setFase] = useState<'prompt' | 'resposta'>('prompt');
  const [preparedDocs, setPreparedDocs] = useState<Documento[]>(documentos);
  const [prompt, setPrompt] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [status, setStatus] = useState<PrepStatus>({ total: 0, current: 0, failures: [] });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Audit response phase state
  const [respostaIA, setRespostaIA] = useState('');
  const [errosResposta, setErrosResposta] = useState<string[]>([]);

  // Divisão em lotes (dossiês grandes viram vários prompts menores e independentes)
  const [lotes, setLotes] = useState<LoteAuditoria[]>([]);
  const [loteAtual, setLoteAtual] = useState(0);
  // Operações e erros acumulados ao longo dos lotes, importados de uma vez no fim.
  const [opsAcumuladas, setOpsAcumuladas] = useState<OperacaoParseada[]>([]);
  const [errosAcumulados, setErrosAcumulados] = useState<string[]>([]);
  // Nº (1-based) do último lote processado com sucesso — usado para mostrar um
  // aviso persistente na tela ao avançar de lote (um toast sozinho passa despercebido).
  const [ultimoLoteConcluido, setUltimoLoteConcluido] = useState<number | null>(null);

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
      setErrosResposta([]);
      setOpsAcumuladas([]);
      setErrosAcumulados([]);
      setLoteAtual(0);
      setUltimoLoteConcluido(null);
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

      if (mode === 'memorial') {
        setLotes([]);
        setPrompt(gerarPromptMemorial(promptParams));
      } else {
        const lotesGerados = gerarLotesAuditoria({ ...promptParams, nivelPleiteado: nivelPleiteado as any });
        setLotes(lotesGerados);
        setLoteAtual(0);
        setPrompt(lotesGerados[0]?.prompt ?? '');
      }

      setPreparedDocs(nextDocs);
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

  const totalLotes = lotes.length;
  const haMultiplosLotes = totalLotes > 1;

  const handleProcessarResposta = useCallback(() => {
    if (!respostaIA.trim()) {
      toast.error('Cole a resposta da IA primeiro.');
      return;
    }
    const resultado = parseResultadoAuditoria(respostaIA, { lancamentos, itensRSC });

    const prefixo = haMultiplosLotes ? `Lote ${loteAtual + 1}/${totalLotes}: ` : '';
    const errosDesteLote = resultado.erros.map((erro) => `${prefixo}${erro}`);
    if (resultado.erros.length > 0) {
      toast.warning(`${resultado.erros.length} aviso(s) na validação.`);
    }

    const opsFinais = [...opsAcumuladas, ...resultado.operacoes];
    const errosFinais = [...errosAcumulados, ...errosDesteLote];
    setOpsAcumuladas(opsFinais);
    setErrosAcumulados(errosFinais);
    setErrosResposta(resultado.erros);

    const haProximoLote = haMultiplosLotes && loteAtual < totalLotes - 1;
    if (haProximoLote) {
      const proximo = loteAtual + 1;
      setLoteAtual(proximo);
      setPrompt(lotes[proximo].prompt);
      setRespostaIA('');
      setErrosResposta([]);
      setUltimoLoteConcluido(loteAtual + 1);
      setFase('prompt');
      toast.success(
        `Lote ${loteAtual + 1} de ${totalLotes} processado (${resultado.operacoes.length} operação(ões)). Copie o prompt do lote ${proximo + 1} de ${totalLotes}.`,
      );
      return;
    }

    // Último (ou único) lote: importa tudo para o módulo Auditoria e redireciona.
    importarOperacoesAuditoria('consolidar', opsFinais, errosFinais);
    if (opsFinais.length > 0) {
      toast.success(`${opsFinais.length} operação(ões) enviada(s) para o módulo Auditoria.`);
    } else {
      toast.info('Nenhuma correção proposta. Nada a revisar no módulo Auditoria.');
    }
    onClose();
    navigate('/auditoria');
  }, [respostaIA, lancamentos, itensRSC, lotes, loteAtual, totalLotes, haMultiplosLotes, opsAcumuladas, errosAcumulados, importarOperacoesAuditoria, onClose, navigate]);

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
                : 'O sistema prepara as transcrições e gera um prompt estruturado para a IA auditar os lançamentos. Copie o prompt, envie para uma IA externa e cole a resposta em JSON — as correções propostas vão para o módulo Auditoria, onde você revisa e aplica.'}
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
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-2.5 sm:px-6">
            <div className="flex items-center gap-2">
              {[
                { key: 'prompt', label: '1. Copiar prompt', num: 1 },
                { key: 'resposta', label: '2. Colar resposta', num: 2 },
              ].map((s, idx) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${fase === s.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {s.num}
                  </span>
                  <span className={`text-xs font-bold ${fase === s.key ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
                  {idx < 1 && <span className="text-gray-200">→</span>}
                </div>
              ))}
            </div>
            {haMultiplosLotes && (
              <div className="flex items-center gap-2 rounded-full bg-violet-50 py-1 pl-1 pr-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalLotes }, (_, i) => i + 1).map((n) => {
                    const concluido = n <= (ultimoLoteConcluido ?? 0);
                    const atual = n === loteAtual + 1;
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
                  Lote {loteAtual + 1} de {totalLotes}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {/* ── Fase: PROMPT ─────────────────────────────────────── */}
          {fase === 'prompt' && (
            <>
              {ultimoLoteConcluido !== null && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    <strong>Lote {ultimoLoteConcluido} de {totalLotes} concluído</strong> — {opsAcumuladas.length} operação(ões) capturada(s) até agora. Copie abaixo o prompt do <strong>lote {loteAtual + 1} de {totalLotes}</strong> e repita o processo.
                  </p>
                </div>
              )}

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

              {haMultiplosLotes && (
                <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                  {`Este dossiê foi dividido automaticamente em ${totalLotes} lotes para evitar que a IA perca qualidade ou falhe com um prompt grande demais. Copie o prompt do lote ${loteAtual + 1}, cole a resposta e o sistema avança para o próximo lote sozinho — as operações de todos os lotes são reunidas no módulo Auditoria.`}
                </div>
              )}

              {!haMultiplosLotes && promptTokens > 15000 && (
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
                    {haMultiplosLotes
                      ? `Cole aqui a resposta JSON da IA para o lote ${loteAtual + 1} de ${totalLotes}. O sistema valida e reúne as operações no módulo Auditoria.`
                      : 'Cole aqui a resposta JSON da IA. O sistema valida e envia as operações de correção para o módulo Auditoria.'}
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
                  onClick={() => downloadTextFile(prompt, servidor, mode, haMultiplosLotes ? `lote-${loteAtual + 1}-de-${totalLotes}` : undefined)}
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
                    {haMultiplosLotes ? `Já copiei — colar resposta do lote ${loteAtual + 1}` : 'Já copiei — colar resposta'}
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
                {haMultiplosLotes && loteAtual < totalLotes - 1
                  ? `Processar e ir para o lote ${loteAtual + 2}`
                  : 'Processar e enviar à Auditoria'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
