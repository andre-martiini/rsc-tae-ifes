import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ChevronRight, FileBox, Inbox, Layers, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Inciso } from '../data/mock';
import ItemDetailPanel from '../components/ItemDetailPanel';
import ItemListItem from '../components/ItemListItem';
import { Button } from '../components/ui/button';
import { formatPointValue, sumPointValues } from '../lib/points';
import { getEligibleRscLevel, isItemJuridicallyFragile } from '../lib/rsc';
import AppHeader from '../components/AppHeader';

const incisosInfo: { id: Inciso; title: string; desc: string }[] = [
  { id: 'I',   title: 'Inciso I',   desc: 'Comissões, GTs e representações' },
  { id: 'II',  title: 'Inciso II',  desc: 'Projetos, ensino e extensão' },
  { id: 'III', title: 'Inciso III', desc: 'Premiações e reconhecimentos' },
  { id: 'IV',  title: 'Inciso IV',  desc: 'Responsabilidades técnico-adm.' },
  { id: 'V',   title: 'Inciso V',   desc: 'Direção e assessoramento' },
  { id: 'VI',  title: 'Inciso VI',  desc: 'Produção e difusão do conhecimento' },
];

export default function Workspace() {
  const { servidor, itensRSC, lancamentos, processo } = useAppContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeInciso, setActiveInciso] = useState<Inciso>('I');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isIncisoSidebarCollapsed, setIsIncisoSidebarCollapsed] = useState(false);
  const [isItemsSidebarCollapsed, setIsItemsSidebarCollapsed] = useState(false);
  const requestedItemId = searchParams.get('item');

  useEffect(() => {
    if (!requestedItemId) {
      return;
    }

    const requestedItem = itensRSC.find((item) => item.id === requestedItemId);

    if (!requestedItem) {
      return;
    }

    setSelectedItemId((current) => (current === requestedItem.id ? current : requestedItem.id));
    setActiveInciso((current) => (current === requestedItem.inciso ? current : requestedItem.inciso));
  }, [itensRSC, requestedItemId]);

  if (!servidor) {
    return <Navigate to="/perfil" replace />;
  }

  const nivelElegivel = getEligibleRscLevel(servidor.escolaridade_atual);

  const lancamentosDoServidor = useMemo(
    () => lancamentos.filter((lancamento) => lancamento.servidor_id === servidor.id),
    [lancamentos, servidor.id],
  );

  const incisoPoints = useMemo(() => {
    const pointsMap: Record<string, number> = {};

    incisosInfo.forEach((inciso) => {
      const itemsOfInciso = itensRSC.filter((item) => item.inciso === inciso.id).map((item) => item.id);

      pointsMap[inciso.id] = sumPointValues(
        lancamentosDoServidor
          .filter((lancamento) => itemsOfInciso.includes(lancamento.item_rsc_id))
          .map((lancamento) => lancamento.pontos_calculados),
      );
    });

    return pointsMap;
  }, [itensRSC, lancamentosDoServidor]);

  const totalPontos = useMemo(
    () => sumPointValues(lancamentosDoServidor.map((entry) => entry.pontos_calculados)),
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

  const activeItems = useMemo(
    () => itensRSC.filter((item) => item.inciso === activeInciso),
    [itensRSC, activeInciso],
  );

  const selectedItem = useMemo(
    () => itensRSC.find((item) => item.id === selectedItemId),
    [itensRSC, selectedItemId],
  );

  const getItemPoints = (itemId: string) =>
    sumPointValues(
      lancamentosDoServidor
        .filter((lancamento) => lancamento.item_rsc_id === itemId)
        .map((lancamento) => lancamento.pontos_calculados),
    );

  const getItemHasLancamentos = (itemId: string) =>
    lancamentosDoServidor.some((lancamento) => lancamento.item_rsc_id === itemId);

  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <div className="flex h-full flex-col">
        <AppHeader
          activeView="workspace"
          onNavigateDashboard={() => navigate('/dashboard')}
          onNavigateHome={() => navigate('/')}
          onNavigateCatalog={() => navigate('/itens')}
          onNavigateWorkspace={() => undefined}
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

        <div className="flex flex-1 overflow-hidden">
          <aside
            className={`shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50/50 transition-[width] duration-300 ${isIncisoSidebarCollapsed ? 'w-24' : 'w-64'
              }`}
          >
            <div
              className={`sticky top-0 z-10 border-b border-gray-100/50 bg-white/50 p-4 backdrop-blur-sm ${isIncisoSidebarCollapsed ? 'px-3' : ''
                }`}
            >
              <div
                className={`flex items-center ${isIncisoSidebarCollapsed ? 'justify-center' : 'justify-between gap-3'
                  }`}
              >
                {!isIncisoSidebarCollapsed && (
                  <h3 className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <Layers className="h-3 w-3" />
                    Incisos de avaliação
                  </h3>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label={isIncisoSidebarCollapsed ? 'Expandir incisos' : 'Recolher incisos'}
                  title={isIncisoSidebarCollapsed ? 'Expandir incisos' : 'Recolher incisos'}
                  className="h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  onClick={() => setIsIncisoSidebarCollapsed((current) => !current)}
                >
                  {isIncisoSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <nav className="space-y-1 p-3">
              {incisosInfo.map((inciso) => {
                const isActive = activeInciso === inciso.id;
                const pontos = incisoPoints[inciso.id];

                return (
                  <button
                    key={inciso.id}
                    type="button"
                    title={`${inciso.title}: ${inciso.desc}`}
                    onClick={() => {
                      setActiveInciso(inciso.id);
                      setSelectedItemId(null);
                      setSearchParams((currentParams) => {
                        const nextParams = new URLSearchParams(currentParams);
                        nextParams.delete('item');
                        return nextParams;
                      });
                    }}
                    className={`relative flex w-full flex-col rounded-xl border transition-all duration-300 ${isActive
                      ? 'border-primary/20 bg-white shadow-sm shadow-primary/5'
                      : 'border-transparent text-gray-500 hover:bg-gray-100 active:scale-[0.98]'
                      } ${isIncisoSidebarCollapsed ? 'items-center px-2 py-3.5' : 'items-start px-4 py-3'}`}
                  >
                    <div
                      className={`flex w-full items-center ${isIncisoSidebarCollapsed ? 'mb-2 justify-center' : 'mb-1 justify-between'
                        }`}
                    >
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-primary' : 'text-gray-400'
                          }`}
                      >
                        {inciso.id}
                      </span>
                      {!isIncisoSidebarCollapsed && pontos > 0 && (
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-black ${isActive
                            ? 'border-primary/20 bg-primary/10 text-primary'
                            : 'border-gray-300 bg-gray-200 text-gray-600'
                            }`}
                        >
                          {pontos}
                        </span>
                      )}
                    </div>

                    {isIncisoSidebarCollapsed ? (
                      <>
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black transition-colors ${isActive
                            ? 'bg-primary text-white shadow-sm shadow-primary/20'
                            : 'border border-gray-200 bg-white text-gray-600'
                            }`}
                        >
                          {inciso.id}
                        </span>
                        {pontos > 0 && <span className="mt-2 text-[10px] font-bold text-gray-500">{formatPointValue(pontos)} pts</span>}
                      </>
                    ) : (
                      <span
                        className={`text-sm font-bold transition-colors ${isActive ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                          }`}
                      >
                        {inciso.desc}
                      </span>
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute left-[-1px] top-1/2 h-3/5 w-[3px] -translate-y-1/2 rounded-full bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div
            className={`relative z-20 flex shrink-0 flex-col overflow-hidden border-r border-gray-100 bg-white shadow-[4px_0_15px_-10px_rgba(0,0,0,0.05)] transition-[width] duration-300 ${isItemsSidebarCollapsed ? 'w-24' : 'w-72 xl:w-80'
              }`}
          >
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-4">
              <div className={`flex items-center ${isItemsSidebarCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
                {!isItemsSidebarCollapsed && (
                  <div>
                    <h3 className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <FileBox className="h-3 w-3" />
                      Itens disponíveis
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">{activeItems.length}</span>
                      <span className="text-xs font-medium text-gray-500">ocorrências localizadas</span>
                    </div>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label={isItemsSidebarCollapsed ? 'Expandir itens disponíveis' : 'Recolher itens disponíveis'}
                  title={isItemsSidebarCollapsed ? 'Expandir itens disponíveis' : 'Recolher itens disponíveis'}
                  className="h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  onClick={() => setIsItemsSidebarCollapsed((current) => !current)}
                >
                  {isItemsSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className={`custom-scrollbar flex-1 space-y-2 overflow-y-auto bg-gray-50/20 ${isItemsSidebarCollapsed ? 'p-2' : 'p-3'}`}>
              {activeItems.length > 0 ? (
                activeItems.map((item) => (
                  <ItemListItem
                    key={item.id}
                    item={item}
                    isActive={selectedItemId === item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setSearchParams((currentParams) => {
                        const nextParams = new URLSearchParams(currentParams);
                        nextParams.set('item', item.id);
                        return nextParams;
                      });
                    }}
                    hasLancamentos={getItemHasLancamentos(item.id)}
                    pontos={getItemPoints(item.id)}
                    isCollapsed={isItemsSidebarCollapsed}
                    isFragile={isItemJuridicallyFragile(item)}
                  />
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center opacity-40">
                  <Inbox className="mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Nenhum item carregado</p>
                </div>
              )}
            </div>
          </div>

          <main className="relative z-10 flex flex-1 flex-col overflow-hidden bg-gray-50/30 transition-colors duration-500">
            <AnimatePresence mode="wait">
              {selectedItem ? (
                <motion.div
                  key={selectedItem.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="h-full"
                >
                  <ItemDetailPanel item={selectedItem} onSaved={() => undefined} />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col items-center justify-center p-12 text-center"
                >
                  <div className="relative mb-8">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-primary/20 blur-3xl"></div>
                    <div className="relative rounded-3xl border border-primary/10 bg-white p-6 shadow-xl shadow-primary/5">
                      <Sparkles className="animate-bounce-slow h-16 w-16 text-primary" />
                    </div>
                  </div>
                  <h2 className="mb-3 text-2xl font-black text-gray-900">Pronto para lançar</h2>
                  <p className="mb-8 max-w-sm leading-relaxed text-gray-500">
                    Selecione um item da lista à esquerda para carregar as regras de aceite e preencher o formulário de
                    comprovação.
                  </p>
                  <div className="flex gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-200"></span>
                    <span className="h-2 w-2 rounded-full bg-gray-300"></span>
                    <span className="h-2 w-2 rounded-full bg-gray-200"></span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }

        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
