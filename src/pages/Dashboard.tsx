import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, CheckCircle2, ChevronRight, LayoutGrid, List, Wand2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { RSC_LEVELS } from '../data/mock';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { getEligibleRscLevel } from '../lib/rsc';
import AppHeader from '../components/AppHeader';
import WizardModal from '../components/WizardModal';

const levelAccentClasses = [
  {
    bar: 'bg-emerald-600',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    bar: 'bg-sky-600',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    bar: 'bg-indigo-600',
    chip: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    bar: 'bg-amber-600',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    bar: 'bg-rose-600',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    bar: 'bg-slate-700',
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
  },
];

export default function Dashboard() {
  const { servidor, itensRSC, lancamentos, processo, logout, wizardRecommendedIds, setWizardRecommendedIds } = useAppContext();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);

  if (!servidor) {
    return <Navigate to="/" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const lancamentosDoServidor = lancamentos.filter((lancamento) => lancamento.servidor_id === servidor.id);
  const totalPontos = lancamentosDoServidor.reduce((acc, lancamento) => acc + lancamento.pontos_calculados, 0);
  const itensDistintos = new Set(lancamentosDoServidor.map((lancamento) => lancamento.item_rsc_id)).size;
  const nivelElegivel = getEligibleRscLevel(servidor.escolaridade_atual);

  const nivelPleiteavel = nivelElegivel
    ? RSC_LEVELS.map((nivel, index) => ({
        ...nivel,
        accent: levelAccentClasses[index],
        pontosPct: Math.min(100, Math.round((totalPontos / nivel.pontosMinimos) * 100)),
        itensPct: Math.min(100, Math.round((itensDistintos / nivel.itensMinimos) * 100)),
        pontosFaltantes: Math.max(0, nivel.pontosMinimos - totalPontos),
        itensFaltantes: Math.max(0, nivel.itensMinimos - itensDistintos),
        atingido: totalPontos >= nivel.pontosMinimos && itensDistintos >= nivel.itensMinimos,
      })).find((nivel) => nivel.id === nivelElegivel.id) ?? null
    : null;

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const resumoItensLancados = useMemo(() => {
    const itemMap = new Map<
      string,
      {
        itemId: string;
        numero: number;
        descricao: string;
        pontos: number;
      }
    >();

    lancamentosDoServidor.forEach((lancamento) => {
      const item = itensRSC.find((candidate) => candidate.id === lancamento.item_rsc_id);

      if (!item) {
        return;
      }

      const current = itemMap.get(item.id);

      itemMap.set(item.id, {
        itemId: item.id,
        numero: item.numero,
        descricao: item.descricao,
        pontos: Number(((current?.pontos ?? 0) + lancamento.pontos_calculados).toFixed(2)),
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => a.numero - b.numero);
  }, [itensRSC, lancamentosDoServidor]);

  return (
    <div className="min-h-screen bg-gray-50">
      {wizardOpen && (
        <WizardModal
          onClose={() => setWizardOpen(false)}
          onConfirm={(ids) => {
            setWizardRecommendedIds(ids);
            setWizardOpen(false);
          }}
          initialIds={wizardRecommendedIds}
        />
      )}
      <AppHeader
        activeView="dashboard"
        onNavigateDashboard={() => undefined}
        onNavigateCatalog={() => navigate('/itens')}
        onNavigateWorkspace={() => navigate('/workspace')}
        onNavigateConsolidate={() => navigate('/consolidar')}
        onLogout={handleLogout}
        secondaryContent={
          <>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Status:</span> {processo.status}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Total:</span> {totalPontos.toFixed(2)} pts
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Nível pleiteável:</span>{' '}
              {nivelElegivel ? nivelElegivel.label : 'Não mapeado'}
            </div>
          </>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{servidor.nome_completo}</h2>
                <p className="text-gray-500">Lotação: {servidor.lotacao}</p>
                <p className="text-gray-500">SIAPE: {servidor.siape}</p>
              </div>
              <div className="md:max-w-sm">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <BookOpenText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Formação atual</p>
                    <p className="text-sm font-medium text-gray-900">
                      {servidor.escolaridade_atual} - referência do protótipo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wizard CTA */}
        <Card className={`border shadow-sm ${wizardRecommendedIds.length > 0 ? 'border-violet-200 bg-violet-50/40' : 'border-gray-200 bg-white'}`}>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-2.5 ${wizardRecommendedIds.length > 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {wizardRecommendedIds.length > 0
                    ? `${wizardRecommendedIds.length} itens recomendados pelo Wizard`
                    : 'Precisa de ajuda para começar?'}
                </p>
                <p className="text-sm text-gray-500">
                  {wizardRecommendedIds.length > 0
                    ? 'Veja os itens destacados na página de Itens. Você pode refazer o mapeamento a qualquer momento.'
                    : 'Responda algumas perguntas sobre seu histórico e o sistema indicará os itens mais aderentes ao seu perfil.'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {wizardRecommendedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/itens')}
                  className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                >
                  Ver itens
                </button>
              )}
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                {wizardRecommendedIds.length > 0 ? 'Refazer mapeamento' : 'Iniciar Wizard'}
              </button>
            </div>
          </CardContent>
        </Card>

        {nivelPleiteavel && (
          <Card className="border-primary/30 bg-white shadow-sm shadow-primary/10">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900">{nivelPleiteavel.label}</h3>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${nivelPleiteavel.accent.chip}`}>
                      {nivelPleiteavel.atingido ? 'Pronto para envio' : 'Nível em foco'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Equivalência pretendida: {nivelPleiteavel.equivalencia}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl bg-gray-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Pontuação</p>
                    {nivelPleiteavel.atingido && (
                      <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Meta atingida
                      </p>
                    )}
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <p className="text-3xl font-black text-gray-900">
                      {totalPontos.toFixed(2)}
                      <span className="text-lg font-bold text-gray-500"> / {nivelPleiteavel.pontosMinimos} pts</span>
                    </p>
                    <p className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                      Faltam {nivelPleiteavel.pontosFaltantes.toFixed(2)} pontos
                    </p>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-3 rounded-full transition-all ${nivelPleiteavel.accent.bar}`}
                      style={{ width: `${nivelPleiteavel.pontosPct}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl bg-gray-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Itens distintos</p>
                  <div className="flex items-end justify-between gap-4">
                    <p className="text-3xl font-black text-gray-900">
                      {itensDistintos}
                      <span className="text-lg font-bold text-gray-500"> / {nivelPleiteavel.itensMinimos} itens</span>
                    </p>
                    <p className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                      Faltam {nivelPleiteavel.itensFaltantes} itens
                    </p>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-3 rounded-full transition-all ${nivelPleiteavel.accent.bar}`}
                      style={{ width: `${nivelPleiteavel.itensPct}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {resumoItensLancados.length > 0 && (
          <Card className="border-gray-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Itens já lançados</h3>
                  <p className="text-xs text-gray-500">
                    Resumo rápido dos itens já marcados e da pontuação acumulada em cada um.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                    {resumoItensLancados.length} itens
                  </span>
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
              </div>

              {viewMode === 'cards' ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {resumoItensLancados.map((item) => (
                    <button
                      key={item.itemId}
                      type="button"
                      onClick={() => navigate(`/workspace?item=${item.itemId}`)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                            Item {item.numero}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-800">{item.descricao}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-right">
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                        <p className="text-lg font-black text-gray-900">{item.pontos.toFixed(2)}</p>
                        <div>
                          <p className="text-[11px] text-gray-500">pts</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Item</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Descrição</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">Pontos</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumoItensLancados.map((item, index) => (
                        <tr
                          key={item.itemId}
                          onClick={() => navigate(`/workspace?item=${item.itemId}`)}
                          className={`cursor-pointer transition-colors hover:bg-primary/5 ${index !== resumoItensLancados.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                          <td className="px-3 py-2.5">
                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary whitespace-nowrap">
                              Item {item.numero}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-800">{item.descricao}</td>
                          <td className="px-3 py-2.5 text-right font-black text-gray-900 whitespace-nowrap">
                            {item.pontos.toFixed(2)} <span className="text-[11px] font-normal text-gray-500">pts</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <ChevronRight className="h-4 w-4 text-gray-300" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

