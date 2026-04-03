import React, { useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LayoutGrid, List, Search, ShieldAlert, Sparkles, Wand2 } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useAppContext } from '../context/AppContext';
import { addPointValues, formatPointValue, sumPointValues } from '../lib/points';
import { getEligibleRscLevel, isItemJuridicallyFragile } from '../lib/rsc';
import type { Inciso } from '../data/mock';

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const incisoLabels: Record<string, string> = {
  I: 'Comissões e GTs',
  II: 'Projetos institucionais',
  III: 'Premiação',
  IV: 'Responsabilidades técnicas',
  V: 'Direção e assessoramento',
  VI: 'Publicações e produção',
};

const ALL_INCISOS: Inciso[] = ['I', 'II', 'III', 'IV', 'V', 'VI'];

type StatusFilter = 'todos' | 'sem_lancamento' | 'em_andamento' | 'completo';

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'sem_lancamento', label: 'Sem lançamento' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'completo', label: 'Completo' },
];

function getItemStatus(pontosLancados: number, limitepontos: number | undefined): StatusFilter {
  if (pontosLancados === 0) return 'sem_lancamento';
  if (limitepontos !== undefined && pontosLancados >= limitepontos) return 'completo';
  return 'em_andamento';
}

export default function ItemCatalog() {
  const { servidor, itensRSC, lancamentos, processo, wizardRecommendedIds } = useAppContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedIncisos, setSelectedIncisos] = useState<Set<Inciso>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [wizardOnly, setWizardOnly] = useState(false);

  const servidorId = servidor?.id ?? '';
  const escolaridadeAtual = servidor?.escolaridade_atual ?? '';

  const nivelElegivel = getEligibleRscLevel(escolaridadeAtual);
  const lancamentosDoServidor = useMemo(
    () => lancamentos.filter((lancamento) => lancamento.servidor_id === servidorId),
    [lancamentos, servidorId],
  );
  const totalPontos = useMemo(
    () => sumPointValues(lancamentosDoServidor.map((lancamento) => lancamento.pontos_calculados)),
    [lancamentosDoServidor],
  );

  const itensDistintos = useMemo(
    () => new Set(lancamentosDoServidor.map((l) => l.item_rsc_id)).size,
    [lancamentosDoServidor],
  );

  const metasAtingidas =
    !!nivelElegivel &&
    totalPontos >= nivelElegivel.pontosMinimos &&
    itensDistintos >= nivelElegivel.itensMinimos;

  const lancamentosByItemId = useMemo(() => {
    const map = new Map<string, number>();
    lancamentosDoServidor.forEach((lancamento) => {
      map.set(
        lancamento.item_rsc_id,
        addPointValues(map.get(lancamento.item_rsc_id) ?? 0, lancamento.pontos_calculados),
      );
    });
    return map;
  }, [lancamentosDoServidor]);

  const toggleInciso = (inciso: Inciso) => {
    setSelectedIncisos((prev) => {
      const next = new Set(prev);
      if (next.has(inciso)) {
        next.delete(inciso);
      } else {
        next.add(inciso);
      }
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    let items = itensRSC;

    // text search
    const normalizedQuery = normalizeSearch(query);
    if (normalizedQuery) {
      items = items.filter((item) =>
        [
          item.descricao,
          item.inciso,
          incisoLabels[item.inciso],
          item.regra_aceite,
          item.documentos_comprobatorios,
          item.unidade_medida,
        ]
          .map(normalizeSearch)
          .some((field) => field.includes(normalizedQuery)),
      );
    }

    // inciso filter
    if (selectedIncisos.size > 0) {
      items = items.filter((item) => selectedIncisos.has(item.inciso));
    }

    // status filter
    if (statusFilter !== 'todos') {
      items = items.filter((item) => {
        const pontos = lancamentosByItemId.get(item.id) ?? 0;
        return getItemStatus(pontos, item.limite_pontos) === statusFilter;
      });
    }

    // wizard filter
    if (wizardOnly) {
      items = items.filter((item) => wizardRecommendedIds.includes(item.id));
    }

    return items;
  }, [itensRSC, query, selectedIncisos, statusFilter, wizardOnly, lancamentosByItemId, wizardRecommendedIds]);

  const hasWizardRecs = wizardRecommendedIds.length > 0;

  if (!servidor) {
    return <Navigate to="/perfil" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        activeView="catalog"
        onNavigateDashboard={() => navigate('/dashboard')}
        onNavigateHome={() => navigate('/')}
        onNavigateCatalog={() => undefined}
        onNavigateWorkspace={() => navigate('/workspace')}
        onNavigateConsolidate={() => navigate('/consolidar')}
        onNavigateProfile={() => navigate('/perfil')}
        secondaryContent={
          <>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Status:</span> {processo.status}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Total:</span> {formatPointValue(totalPontos)} pts
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Itens:</span> {itensDistintos}
            </div>
            {metasAtingidas && (
              <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                <CheckCircle2 className="h-3 w-3" />
                Metas atingidas
              </div>
            )}
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Nível pleiteável:</span>{' '}
              {nivelElegivel ? nivelElegivel.label : 'Não mapeado'}
            </div>
          </>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Catálogo de Itens do RSC-TAE
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Encontre o item certo antes do lançamento</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Pesquise por descrição, inciso, regra de aceite ou documento comprobatório e abra o item
                  diretamente na tela de lançamento.
                </p>
              </div>

              <div className="w-full lg:max-w-md">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar item, inciso, documento ou regra..."
                    className="h-11 border-gray-200 pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Filters row */}
            <div className="space-y-3 border-t border-gray-100 pt-4">
              {/* Inciso filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Inciso
                </span>
                {ALL_INCISOS.map((inciso) => {
                  const active = selectedIncisos.has(inciso);
                  return (
                    <button
                      key={inciso}
                      type="button"
                      onClick={() => toggleInciso(inciso)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${active
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                        }`}
                    >
                      {inciso} — {incisoLabels[inciso]}
                    </button>
                  );
                })}
                {selectedIncisos.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIncisos(new Set())}
                    className="text-[11px] text-gray-400 hover:text-gray-600 underline"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Status filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Situação
                </span>
                {statusOptions.map((opt) => {
                  const active = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatusFilter(opt.value)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${active
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Wizard filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Wizard
                </span>
                <button
                  type="button"
                  disabled={!hasWizardRecs}
                  onClick={() => setWizardOnly((prev) => !prev)}
                  title={
                    hasWizardRecs
                      ? `${wizardRecommendedIds.length} itens recomendados pelo wizard`
                      : 'Execute o Wizard de Mapeamento para ver recomendações personalizadas'
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${!hasWizardRecs
                    ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                    : wizardOnly
                      ? 'border-violet-400 bg-violet-500 text-white'
                      : 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-violet-100'
                    }`}
                >
                  <Wand2 className="h-3 w-3" />
                  {hasWizardRecs
                    ? `Recomendados (${wizardRecommendedIds.length})`
                    : 'Recomendados pelo Wizard (sem resultados)'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                  {filteredItems.length} itens encontrados
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                  {lancamentosByItemId.size} itens já lançados
                </span>
              </div>
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Visualizar como cards"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Visualizar como tabela"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === 'cards' ? (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredItems.map((item) => {
              const pontosLancados = lancamentosByItemId.get(item.id) ?? 0;
              const isFragile = isItemJuridicallyFragile(item);
              const itemStatus = getItemStatus(pontosLancados, item.limite_pontos);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/workspace?item=${item.id}`)}
                  className="group text-left"
                >
                  <Card className="h-full min-h-[430px] border-gray-200 bg-white transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                            {item.numero}
                          </div>
                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                                Inciso {item.inciso}
                              </span>
                              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600">
                                {formatPointValue(item.pontos_por_unidade)} pts/un
                              </span>
                              {item.quantidade_automatica && (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                                  Cálculo automático
                                </span>
                              )}
                              {isFragile && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                  <ShieldAlert className="h-3 w-3" />
                                  Enquadramento sensível
                                </span>
                              )}
                              {wizardRecommendedIds.includes(item.id) && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                                  <Wand2 className="h-3 w-3" />
                                  Recomendado
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-bold leading-snug text-gray-900">{item.descricao}</h3>
                          </div>
                        </div>

                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Unidade</p>
                          <p className="mt-1 text-sm font-medium text-gray-800">{item.unidade_medida}</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Situação</p>
                          <p className={`mt-1 text-sm font-medium ${itemStatus === 'completo'
                            ? 'text-emerald-700'
                            : itemStatus === 'em_andamento'
                              ? 'text-sky-700'
                              : 'text-gray-800'
                            }`}>
                            {itemStatus === 'completo'
                              ? `Completo — ${formatPointValue(pontosLancados)} pts`
                              : itemStatus === 'em_andamento'
                                ? `${formatPointValue(pontosLancados)} pts lançados`
                                : 'Ainda sem lançamento'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Regra de aceite</p>
                          <p className="mt-1 line-clamp-5 text-[13px] leading-relaxed text-gray-600">{item.regra_aceite}</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Comprovação</p>
                          <p className="mt-1 line-clamp-5 text-[13px] leading-relaxed text-gray-600">
                            {item.documentos_comprobatorios}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </section>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Item</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Inciso</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Descrição</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Unidade</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">Pts/un</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Situação</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const pontosLancados = lancamentosByItemId.get(item.id) ?? 0;
                  const isFragile = isItemJuridicallyFragile(item);
                  const itemStatus = getItemStatus(pontosLancados, item.limite_pontos);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/workspace?item=${item.id}`)}
                      className={`cursor-pointer transition-colors hover:bg-primary/5 ${index !== filteredItems.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                          {item.numero}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 whitespace-nowrap">
                          Inciso {item.inciso}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.descricao}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.quantidade_automatica && (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                              Cálculo automático
                            </span>
                          )}
                          {isFragile && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              <ShieldAlert className="h-2.5 w-2.5" />
                              Enquadramento sensível
                            </span>
                          )}
                          {wizardRecommendedIds.includes(item.id) && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              <Wand2 className="h-2.5 w-2.5" />
                              Recomendado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.unidade_medida}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatPointValue(item.pontos_por_unidade)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {itemStatus === 'completo' ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            Completo — {formatPointValue(pontosLancados)} pts
                          </span>
                        ) : itemStatus === 'em_andamento' ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                            {formatPointValue(pontosLancados)} pts
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">Sem lançamento</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ArrowRight className="h-4 w-4 text-gray-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredItems.length === 0 && (
          <Card className="border-dashed border-gray-300 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <Search className="h-8 w-8 text-gray-300" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Nenhum item encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Tente outro termo de busca ou ajuste os filtros ativos.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
