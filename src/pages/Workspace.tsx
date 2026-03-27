import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Inciso, ItemRSC } from '../data/mock';
import ItemDetailPanel from '../components/ItemDetailPanel';
import ItemListItem from '../components/ItemListItem';
import { Button } from '../components/ui/button';
import { 
  ArrowLeft, 
  CheckCircle2, 
  LayoutDashboard, 
  Settings, 
  ChevronRight, 
  Layers, 
  FileBox, 
  Inbox,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const incisos_info: { id: Inciso; title: string; desc: string }[] = [
  { id: 'I', title: 'Inciso I', desc: 'Comissões e GTs' },
  { id: 'II', title: 'Inciso II', desc: 'Projetos Institucionais' },
  { id: 'III', title: 'Inciso III', desc: 'Premiação' },
  { id: 'IV', title: 'Inciso IV', desc: 'Responsabilidades Técnicas' },
  { id: 'V', title: 'Inciso V', desc: 'Direção e Assessoramento' },
  { id: 'VI', title: 'Inciso VI', desc: 'Publicações e Produção' },
];

export default function Workspace() {
  const { servidor, itensRSC, lancamentos } = useAppContext();
  const navigate = useNavigate();
  const [activeInciso, setActiveInciso] = useState<Inciso>('I');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  if (!servidor) {
    return null;
  }

  // Memoized points calculation per Inciso
  const incisoPoints = useMemo(() => {
    const pointsMap: Record<string, number> = {};
    incisos_info.forEach(inciso => {
      const itemsOfInciso = itensRSC.filter(item => item.inciso === inciso.id).map(i => i.id);
      pointsMap[inciso.id] = lancamentos
        .filter(lanc => itemsOfInciso.includes(lanc.item_rsc_id))
        .reduce((acc, curr) => acc + curr.pontos_calculados, 0);
    });
    return pointsMap;
  }, [itensRSC, lancamentos]);

  // Total points calculation
  const totalPoints = useMemo(() => 
    lancamentos.reduce((acc, curr) => acc + curr.pontos_calculados, 0),
  [lancamentos]);

  // Active items for the selected Inciso
  const activeItems = useMemo(() => 
    itensRSC.filter(item => item.inciso === activeInciso),
  [itensRSC, activeInciso]);

  // Currently selected item object
  const selectedItem = useMemo(() => 
    itensRSC.find(i => i.id === selectedItemId),
  [itensRSC, selectedItemId]);

  const getItemPoints = (itemId: string) => {
    return lancamentos
      .filter(l => l.item_rsc_id === itemId)
      .reduce((acc, curr) => acc + curr.pontos_calculados, 0);
  };

  const getItemHasLancamentos = (itemId: string) => {
    return lancamentos.some(l => l.item_rsc_id === itemId);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden">
      {/* Header - Full Width */}
      <header className="h-16 bg-white border-b border-gray-100 px-6 flex justify-between items-center shrink-0 z-30">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')} 
            className="text-gray-400 hover:text-gray-900 group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          </Button>
          <div className="h-6 w-px bg-gray-100 mx-2"></div>
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-none">Workspace</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
              RSC-TAE • {servidor.nome_completo}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Acumulado</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-primary leading-none">{totalPoints}</span>
              <span className="text-[10px] font-bold text-primary uppercase">pts</span>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-6 rounded-lg text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-primary/10">
            Finalizar Processo
          </Button>
        </div>
      </header>

      {/* Main Container - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUNA 1: INCISOS (Extremo Esquerdo) */}
        <aside className="w-64 bg-gray-50/50 border-r border-gray-100 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-gray-100/50 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Layers className="w-3 h-3" /> Incisos de Avaliação
            </h3>
          </div>
          <nav className="p-3 space-y-1">
            {incisos_info.map((inciso) => {
              const isActive = activeInciso === inciso.id;
              const pontos = incisoPoints[inciso.id];
              return (
                <button
                  key={inciso.id}
                  onClick={() => {
                    setActiveInciso(inciso.id);
                    setSelectedItemId(null);
                  }}
                  className={`w-full group flex flex-col items-start px-4 py-3 rounded-xl transition-all duration-300 relative border ${
                    isActive 
                      ? 'bg-white border-primary/20 shadow-sm shadow-primary/5' 
                      : 'border-transparent text-gray-500 hover:bg-gray-100 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex justify-between w-full items-center mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                      isActive ? 'text-primary' : 'text-gray-400'
                    }`}>
                      {inciso.id}
                    </span>
                    {pontos > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${
                        isActive ? 'bg-primary/10 text-primary border-primary/20' : 'bg-gray-200 text-gray-600 border-gray-300'
                      }`}>
                        {pontos}
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-bold transition-colors ${
                    isActive ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                  }`}>
                    {inciso.desc}
                  </span>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="nav-pill"
                      className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-[3px] h-3/5 bg-primary rounded-full"
                    ></motion.div>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* COLUNA 2: ITENS (Colidido à esquerda dos incisos) */}
        <div className="w-80 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-hidden relative shadow-[4px_0_15px_-10px_rgba(0,0,0,0.05)] z-20">
          <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <FileBox className="w-3 h-3" /> Itens Disponíveis
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-black text-gray-900">{activeItems.length}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Ocorrências localizadas</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-gray-50/20 p-3 space-y-2 custom-scrollbar">
            {activeItems.length > 0 ? (
              activeItems.map((item) => (
                <ItemListItem
                  key={item.id}
                  item={item}
                  isActive={selectedItemId === item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  hasLancamentos={getItemHasLancamentos(item.id)}
                  pontos={getItemPoints(item.id)}
                />
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-40">
                <Inbox className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nenhum item carregado</p>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA 3: DETALHES (Ocupa o resto da tela) */}
        <main className="flex-1 overflow-hidden bg-gray-50/30 flex flex-col relative z-10 transition-colors duration-500">
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <motion.div
                key={selectedItem.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full"
              >
                <ItemDetailPanel 
                  item={selectedItem} 
                  onSaved={() => {
                    // Item updated, could do something here but UI will react to context
                  }}
                />
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                  <div className="relative bg-white p-6 rounded-3xl border border-primary/10 shadow-xl shadow-primary/5">
                    <Sparkles className="w-16 h-16 text-primary animate-bounce-slow" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-3">Pronto para Lançar</h2>
                <p className="text-gray-500 max-w-sm mb-8 leading-relaxed">
                  Selecione um item da lista à esquerda para carregar as regras de aceite e preencher o formulário de comprovação.
                </p>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-200"></span>
                  <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                  <span className="w-2 h-2 rounded-full bg-gray-200"></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
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
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
