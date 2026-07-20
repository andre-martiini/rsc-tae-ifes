import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  ExternalLink,
  Info,
  RotateCcw,
  Sparkles,
  FileCheck,
  Trash2,
  X,
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import { Button } from '../components/ui/button';
import DocumentPreviewOverlay from '../components/DocumentPreviewOverlay';
import { useDocumentPreview } from '../hooks/useDocumentPreview';
import { useAppContext } from '../context/AppContext';
import type { Documento, ItemRSC } from '../data/mock';
import {
  ORIGEM_LABEL,
  type OperacaoAuditoria,
  type OrigemAuditoria,
  type StatusOperacao,
} from '../data/auditoria';
import { calcularEfeitoOperacao, projetarPontuacao, type EfeitoOperacao } from '../lib/auditoriaImpacto';
import { getLancamentoDocumentIds, itemDossierCode } from '../lib/documentOrdering';
import { formatPointValue } from '../lib/points';
import type { Periodo } from '../lib/periodos';
import { formatarDataSegura } from '../lib/utils';

const SEVERIDADE_LABEL: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
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
  sinalizar: 'Verificação manual',
};
/** Explicação em linguagem simples do que cada tipo de proposta faz. */
const TIPO_EXPLICACAO: Record<string, string> = {
  remover_lancamento: 'A IA propõe excluir este lançamento do dossiê.',
  reclassificar: 'A IA propõe mover este lançamento para outro item do catálogo.',
  ajustar_periodos: 'A IA propõe corrigir as datas (períodos) deste lançamento.',
  ajustar_quantidade: 'A IA propõe corrigir a quantidade informada neste lançamento.',
  sinalizar: 'Apenas um alerta para você conferir manualmente — nada será alterado automaticamente.',
};
const STATUS_LABEL: Record<StatusOperacao, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  aplicada: 'Aplicada',
};
const ORIGEM_ICON: Record<OrigemAuditoria, typeof FileCheck> = {
  consolidar: FileCheck,
  triagem: Sparkles,
};

const GUIA_STORAGE_KEY = 'rsc-tae-auditoria-guia-visto';

type FiltroStatus = 'todos' | StatusOperacao;
type FiltroOrigem = 'todas' | OrigemAuditoria;

function formatPeriodos(periodos: Periodo[]): string {
  if (periodos.length === 0) return 'Sem período registrado';
  return periodos
    .map((p) => `${formatarDataSegura(p.inicio, '—')} a ${formatarDataSegura(p.fim, '—')}`)
    .join('; ');
}

function DeltaChip({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
        Sem mudança de pontos
      </span>
    );
  }
  const ganho = delta > 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${
        ganho ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {ganho ? '+' : '−'}{formatPointValue(Math.abs(delta))} pts no dossiê
    </span>
  );
}

/** Quadro comparativo "Como está hoje" → "Como ficará" de uma operação. */
function ComparativoEfeito({ op, efeito }: { op: OperacaoAuditoria; efeito: EfeitoOperacao }) {
  const linhaItem = (item: ItemRSC | null) =>
    item ? `${itemDossierCode(item)} — ${item.descricao.length > 70 ? `${item.descricao.slice(0, 70)}…` : item.descricao}` : 'Item não identificado';

  const mostraPeriodos = op.tipo === 'ajustar_periodos' || (op.tipo === 'reclassificar' && (efeito.periodosDepois.length > 0 || efeito.periodosAntes.length > 0));
  const mostraItem = op.tipo === 'reclassificar';

  return (
    <div className="mt-2 space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Como está hoje</p>
          {mostraItem && <p className="text-[11px] font-semibold text-gray-700">{linhaItem(efeito.itemAntes)}</p>}
          <p className="text-[11px] text-gray-600">Quantidade: <strong>{efeito.quantidadeAntes}</strong></p>
          {mostraPeriodos && <p className="text-[11px] text-gray-600">Períodos: {formatPeriodos(efeito.periodosAntes)}</p>}
          <p className="text-[11px] text-gray-600">Pontos: <strong>{formatPointValue(efeito.pontosAntes)}</strong></p>
        </div>
        <div className="hidden items-center sm:flex">
          <ArrowRight className="h-4 w-4 text-gray-300" />
        </div>
        <div className={`rounded-lg border p-2.5 ${efeito.removido ? 'border-red-200 bg-red-50' : 'border-primary/20 bg-primary/5'}`}>
          <p className={`mb-1 text-[10px] font-black uppercase tracking-wider ${efeito.removido ? 'text-red-400' : 'text-primary/60'}`}>
            Como ficará se você aprovar
          </p>
          {efeito.removido ? (
            <p className="text-[11px] font-semibold text-red-700">Lançamento excluído do dossiê</p>
          ) : (
            <>
              {mostraItem && <p className="text-[11px] font-semibold text-gray-800">{linhaItem(efeito.itemDepois)}</p>}
              <p className="text-[11px] text-gray-700">Quantidade: <strong>{efeito.quantidadeDepois}</strong></p>
              {mostraPeriodos && <p className="text-[11px] text-gray-700">Períodos: {formatPeriodos(efeito.periodosDepois)}</p>}
              <p className="text-[11px] text-gray-700">Pontos: <strong>{formatPointValue(efeito.pontosDepois)}</strong></p>
            </>
          )}
        </div>
      </div>
      <DeltaChip delta={efeito.delta} />
    </div>
  );
}

export default function Auditoria() {
  const navigate = useNavigate();
  const {
    auditoria,
    lancamentos,
    itensRSC,
    documentos,
    atualizarOperacaoAuditoria,
    aplicarOperacoesAuditoria,
    limparAuditoria,
  } = useAppContext();
  const preview = useDocumentPreview();

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [filtroOrigem, setFiltroOrigem] = useState<FiltroOrigem>('todas');
  const [guiaVisivel, setGuiaVisivel] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(GUIA_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const docsById = useMemo(() => new Map(documentos.map((d) => [d.id, d])), [documentos]);
  const lancById = useMemo(() => new Map(lancamentos.map((l) => [l.id, l])), [lancamentos]);
  const itensById = useMemo(() => new Map(itensRSC.map((i) => [i.id, i])), [itensRSC]);

  const operacoes = auditoria?.operacoes ?? [];

  const contadores = useMemo(() => {
    const c = { pendente: 0, aprovada: 0, rejeitada: 0, aplicada: 0 };
    for (const op of operacoes) c[op.status] += 1;
    return c;
  }, [operacoes]);

  const operacoesFiltradas = useMemo(() => {
    return operacoes.filter(
      (op) =>
        (filtroStatus === 'todos' || op.status === filtroStatus) &&
        (filtroOrigem === 'todas' || op.origem === filtroOrigem),
    );
  }, [operacoes, filtroStatus, filtroOrigem]);

  const opsAprovadas = contadores.aprovada;
  const revisaveis = operacoes.length - contadores.aplicada;
  const revisadas = contadores.aprovada + contadores.rejeitada;

  const projecao = useMemo(
    () => projetarPontuacao(operacoes, lancamentos, itensRSC),
    [operacoes, lancamentos, itensRSC],
  );

  const fecharGuia = () => {
    setGuiaVisivel(false);
    try {
      window.localStorage.setItem(GUIA_STORAGE_KEY, '1');
    } catch {
      // storage indisponível — o guia só volta a aparecer na próxima visita
    }
  };

  const handleAplicar = () => {
    const { aplicadas, puladas } = aplicarOperacoesAuditoria();
    if (aplicadas === 0 && puladas === 0) {
      toast.info('Nenhuma proposta aprovada para aplicar.');
      return;
    }
    toast.success(`${aplicadas} correção(ões) aplicada(s) ao dossiê${puladas ? `, ${puladas} pulada(s)` : ''}.`);
  };

  const abrirLancamento = (itemRscId: string) => {
    navigate(`/itens?item=${encodeURIComponent(itemRscId)}`);
  };

  const filtrosStatus: Array<{ key: FiltroStatus; label: string }> = [
    { key: 'todos', label: `Todas (${operacoes.length})` },
    { key: 'pendente', label: `Pendentes (${contadores.pendente})` },
    { key: 'aprovada', label: `Aprovadas (${contadores.aprovada})` },
    { key: 'rejeitada', label: `Rejeitadas (${contadores.rejeitada})` },
    { key: 'aplicada', label: `Aplicadas (${contadores.aplicada})` },
  ];

  const filtrosOrigem: Array<{ key: FiltroOrigem; label: string }> = [
    { key: 'todas', label: 'Todas as origens' },
    { key: 'consolidar', label: ORIGEM_LABEL.consolidar },
    { key: 'triagem', label: ORIGEM_LABEL.triagem },
  ];

  return (
    <MainLayout activeView="auditoria">
      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {/* Cabeçalho */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900">Auditoria</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">
                Central das propostas de ajuste geradas pelas auditorias via IA (Consolidar e Dossiê
                Inteligente). Revise, veja os documentos, acesse o lançamento e aplique as correções.
              </p>
            </div>
          </div>
          {operacoes.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                limparAuditoria();
                toast.success('Auditoria limpa.');
              }}
              className="text-xs font-bold text-gray-500"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Limpar tudo
            </Button>
          )}
        </header>

        {operacoes.length === 0 ? (
          <EstadoVazio navigate={navigate} />
        ) : (
          <>
            {/* Guia didático (fecha e não volta) */}
            {guiaVisivel && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <div className="space-y-2 text-sm leading-relaxed text-blue-900">
                      <p className="font-bold">Como funciona esta tela</p>
                      <ol className="list-decimal space-y-1 pl-4 text-xs">
                        <li><strong>Revise</strong> cada proposta: o quadro "Como está hoje → Como ficará" mostra exatamente o que muda, inclusive nos pontos.</li>
                        <li><strong>Decida</strong>: clique em Aprovar ou Rejeitar em cada card. Nada é alterado nesta etapa, e você pode desfazer qualquer decisão.</li>
                        <li><strong>Aplique</strong>: só quando você clicar em "Aplicar" (barra no rodapé) as propostas aprovadas alteram o dossiê de verdade.</li>
                      </ol>
                      <p className="text-xs">
                        Propostas do tipo <strong>Verificação manual</strong> são apenas alertas — não alteram nada; leia, confira o documento e marque como verificada.
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={fecharGuia} className="shrink-0 text-xs font-bold">
                    Entendi
                  </Button>
                </div>
              </div>
            )}

            {/* Filtros + progresso de revisão */}
            <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
              {revisaveis > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-gray-500">
                      Você revisou {revisadas} de {revisaveis} proposta{revisaveis !== 1 ? 's' : ''}
                    </span>
                    {revisadas === revisaveis && (
                      <span className="text-emerald-600">Revisão completa — confira a barra Aplicar abaixo</span>
                    )}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${revisaveis === 0 ? 0 : Math.round((revisadas / revisaveis) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {filtrosStatus.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFiltroStatus(f.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                      filtroStatus === f.key
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filtrosOrigem.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFiltroOrigem(f.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      filtroOrigem === f.key
                        ? 'border-violet-300 bg-violet-50 text-violet-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista */}
            {operacoesFiltradas.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                Nenhuma proposta com os filtros selecionados.
              </p>
            ) : (
              <div className="space-y-3">
                {operacoesFiltradas.map((op) => {
                  const lanc = lancById.get(op.lancamento_id);
                  const item = lanc ? itensById.get(lanc.item_rsc_id) : null;
                  const docsDaOperacao: Documento[] = lanc
                    ? getLancamentoDocumentIds(lanc)
                        .map((docId) => docsById.get(docId))
                        .filter((d): d is Documento => !!d)
                    : [];
                  const OrigemIcon = ORIGEM_ICON[op.origem];
                  const aplicada = op.status === 'aplicada';
                  const isSinalizar = op.tipo === 'sinalizar';
                  const efeito = calcularEfeitoOperacao(op, lanc, itensById);
                  const statusLabel = isSinalizar && op.status === 'rejeitada' ? 'Verificada' : STATUS_LABEL[op.status];
                  const docsRemoverIds = new Set(op.documentos_remover ?? []);
                  const docsRemover = docsDaOperacao.filter((d) => docsRemoverIds.has(d.id));
                  // Rede de segurança: a IA reduziu a quantidade abaixo do nº de
                  // documentos mas não apontou quais desvincular — pode sobrar
                  // comprovante irrelevante no dossiê.
                  const alertaDocsOrfaos =
                    op.tipo === 'ajustar_quantidade' &&
                    op.nova_quantidade !== undefined &&
                    docsRemover.length === 0 &&
                    docsDaOperacao.length > op.nova_quantidade;
                  return (
                    <div
                      key={op.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        op.status === 'aprovada'
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : op.status === 'rejeitada'
                            ? 'border-gray-100 bg-gray-50/40 opacity-80'
                            : aplicada
                              ? 'border-violet-100 bg-violet-50/30'
                              : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${SEVERIDADE_CLASS[op.severidade] ?? SEVERIDADE_CLASS.baixa}`}>
                            {SEVERIDADE_LABEL[op.severidade] ?? op.severidade}
                          </span>
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                            {TIPO_LABEL[op.tipo] ?? op.tipo}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold text-gray-500">
                            <OrigemIcon className="h-3 w-3" />
                            {ORIGEM_LABEL[op.origem]}
                          </span>
                          {(op.status === 'aprovada' || op.status === 'rejeitada' || aplicada) && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              op.status === 'aprovada' ? 'bg-emerald-100 text-emerald-700'
                              : aplicada ? 'bg-violet-100 text-violet-700'
                              : isSinalizar ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-200 text-gray-600'
                            }`}>
                              {statusLabel}
                            </span>
                          )}
                          {item && (
                            <span className="truncate text-xs font-bold text-gray-700">
                              {itemDossierCode(item)} — {item.descricao.slice(0, 60)}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] font-semibold text-gray-400">{TIPO_EXPLICACAO[op.tipo]}</p>

                        <p className="text-xs leading-relaxed text-gray-600">
                          <span className="font-bold text-gray-500">Motivo apontado pela IA: </span>
                          {op.justificativa}
                        </p>

                        {/* O que muda, exatamente */}
                        {!lanc ? (
                          <div className="mt-1 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <p>O lançamento desta proposta não existe mais (pode ter sido removido). Ao aplicar, ela será pulada automaticamente.</p>
                          </div>
                        ) : isSinalizar ? (
                          <div className="mt-1 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2.5 text-[11px] text-blue-800">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <div>
                              <p className="font-bold">Nenhuma alteração automática será feita.</p>
                              <p className="mt-0.5">{op.descricao || 'Confira o(s) documento(s) e o lançamento manualmente.'}</p>
                            </div>
                          </div>
                        ) : efeito ? (
                          <ComparativoEfeito op={op} efeito={efeito} />
                        ) : null}

                        {/* Documentos que serão desvinculados ao aprovar */}
                        {!aplicada && docsRemover.length > 0 && (
                          <div className="mt-1 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-800">
                            <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <div>
                              <p className="font-bold">
                                Ao aprovar, {docsRemover.length} documento{docsRemover.length > 1 ? 's serão desvinculados' : ' será desvinculado'} deste lançamento:
                              </p>
                              <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                                {docsRemover.map((d) => (
                                  <li key={d.id} className="break-all">{d.nome_arquivo}</li>
                                ))}
                              </ul>
                              <p className="mt-1 text-red-600">Assim o comprovante irrelevante não permanece no dossiê. O arquivo continua salvo na aba Documentos.</p>
                            </div>
                          </div>
                        )}

                        {/* Aplicada: registro do que foi desvinculado */}
                        {aplicada && (op.documentos_remover?.length ?? 0) > 0 && (
                          <p className="mt-1 text-[11px] text-violet-500">
                            {op.documentos_remover!.length} documento(s) desvinculado(s) do lançamento.
                          </p>
                        )}

                        {/* Rede de segurança: redução sem indicação de documentos */}
                        {!aplicada && alertaDocsOrfaos && (
                          <div className="mt-1 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <div>
                              <p className="font-bold">Confira os documentos vinculados.</p>
                              <p className="mt-0.5">
                                A nova quantidade ({op.nova_quantidade}) é menor que o número de documentos anexados ({docsDaOperacao.length}), mas a IA não indicou quais desvincular. Pode haver comprovante que não sustenta o fato — revise pelo <strong>Abrir lançamento</strong> e remova os que não se aplicam, para evitar diligência da comissão.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Documentos + ação de lançamento */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {item && (
                            <button
                              type="button"
                              onClick={() => abrirLancamento(item.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/10"
                              title="Abrir o lançamento no catálogo de itens"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Abrir lançamento
                            </button>
                          )}
                          {docsDaOperacao.length > 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              Documento{docsDaOperacao.length > 1 ? 's' : ''}:
                            </span>
                          )}
                          {docsDaOperacao.map((doc) => {
                            const marcadoParaRemover = docsRemoverIds.has(doc.id) && !aplicada;
                            return (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => void preview.abrirPreviewDocumento(doc)}
                                className={`inline-flex max-w-[220px] items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                  marcadoParaRemover
                                    ? 'border-red-200 bg-red-50 text-red-600 hover:border-red-300'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary'
                                }`}
                                title={marcadoParaRemover ? `Será desvinculado ao aprovar — clique para visualizar ${doc.nome_arquivo}` : `Visualizar ${doc.nome_arquivo}`}
                              >
                                {marcadoParaRemover ? <Trash2 className="h-3 w-3 shrink-0" /> : <Eye className="h-3 w-3 shrink-0" />}
                                <span className={`truncate ${marcadoParaRemover ? 'line-through' : ''}`}>{doc.nome_arquivo}</span>
                              </button>
                            );
                          })}
                        </div>

                        {aplicada && op.aplicada_em && (
                          <p className="text-[10px] text-violet-500">
                            Aplicada em {formatarDataSegura(op.aplicada_em, '—')}
                          </p>
                        )}

                        {/* Ações — botões explícitos */}
                        {!aplicada && (
                          <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-2.5">
                            {op.status === 'pendente' && isSinalizar && (
                              <button
                                type="button"
                                onClick={() => atualizarOperacaoAuditoria(op.id, { status: 'rejeitada' })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Concluir verificação
                              </button>
                            )}
                            {op.status === 'pendente' && !isSinalizar && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => atualizarOperacaoAuditoria(op.id, { status: 'aprovada' })}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Aprovar correção
                                </button>
                                <button
                                  type="button"
                                  onClick={() => atualizarOperacaoAuditoria(op.id, { status: 'rejeitada' })}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Rejeitar
                                </button>
                              </>
                            )}
                            {(op.status === 'aprovada' || op.status === 'rejeitada') && (
                              <button
                                type="button"
                                onClick={() => atualizarOperacaoAuditoria(op.id, { status: 'pendente' })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Desfazer decisão
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Barra de ação com projeção */}
            <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
              {opsAprovadas > 0 ? (
                <div className="pl-2 text-xs font-semibold text-gray-600">
                  <p>
                    Pontuação do dossiê: <strong>{formatPointValue(projecao.totalAtual)} pts</strong>
                    <ArrowRight className="mx-1.5 inline h-3 w-3 text-gray-400" />
                    <strong className={projecao.delta < 0 ? 'text-red-600' : projecao.delta > 0 ? 'text-emerald-600' : ''}>
                      {formatPointValue(projecao.totalProjetado)} pts
                    </strong>{' '}
                    após aplicar {opsAprovadas === 1 ? 'a proposta aprovada' : `as ${opsAprovadas} propostas aprovadas`}
                    {projecao.delta !== 0 && (
                      <span className={projecao.delta < 0 ? 'text-red-500' : 'text-emerald-600'}>
                        {' '}({projecao.delta > 0 ? '+' : '−'}{formatPointValue(Math.abs(projecao.delta))})
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="pl-2 text-xs font-semibold text-gray-500">
                  Aprove as propostas que deseja aplicar — o efeito nos pontos aparecerá aqui antes de confirmar.
                </p>
              )}
              <Button
                type="button"
                onClick={handleAplicar}
                disabled={opsAprovadas === 0}
                className="h-10 rounded-xl px-6 text-xs font-black uppercase tracking-widest"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Aplicar {opsAprovadas > 0 ? `(${opsAprovadas})` : ''}
              </Button>
            </div>
          </>
        )}
      </main>

      <DocumentPreviewOverlay
        doc={preview.previewDoc}
        url={preview.previewUrl}
        loading={preview.previewLoading}
        error={preview.previewError}
        onClose={preview.fecharPreviewDocumento}
      />
    </MainLayout>
  );
}

function EstadoVazio({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
        <ClipboardCheck className="h-7 w-7" />
      </div>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-bold text-gray-700">Nenhuma proposta de ajuste ainda.</p>
        <p className="text-xs leading-relaxed text-gray-400">
          As auditorias semânticas via IA geradas no <strong>Dossiê Inteligente</strong> ou na aba{' '}
          <strong>Consolidar</strong> enviam suas propostas de ajuste para cá, onde ficam salvas e você
          pode revisá-las com calma.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/triagem')}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Ir para o Dossiê Inteligente
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/consolidar')}>
          <FileCheck className="mr-1.5 h-3.5 w-3.5" />
          Ir para Consolidar
        </Button>
      </div>
    </div>
  );
}
