import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Inciso } from '../data/mock';
import UploadCard from '../components/UploadCard';
import { Button } from '../components/ui/button';
import { ArrowLeft, CheckCircle, FileText, LayoutDashboard, Settings } from 'lucide-react';

const incisos: { id: Inciso; title: string; desc: string }[] = [
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
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  if (!servidor) {
    return null;
  }

  const getPontosInciso = (inciso: Inciso) => {
    const itensDoInciso = itensRSC.filter(item => item.inciso === inciso).map(item => item.id);
    return lancamentos
      .filter(lanc => itensDoInciso.includes(lanc.item_rsc_id))
      .reduce((acc, curr) => acc + curr.pontos_calculados, 0);
  };

  const activeItems = itensRSC.filter(item => item.inciso === activeInciso);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Workspace de Lançamentos</h1>
            <p className="text-sm text-gray-500">RSC-TAE • {servidor.nome_completo}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-green-50 text-green-800 px-4 py-2 rounded-full text-sm font-medium border border-green-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Total: {lancamentos.reduce((acc, curr) => acc + curr.pontos_calculados, 0)} pts
          </div>
          <Button variant="outline" className="text-gray-600">
            Finalizar e Enviar
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
        {/* Coluna Esquerda (Menu Lateral) */}
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto hidden md:block">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Incisos de Avaliação</h3>
            <nav className="space-y-1">
              {incisos.map((inciso) => {
                const isActive = activeInciso === inciso.id;
                const pontos = getPontosInciso(inciso.id);
                return (
                  <button
                    key={inciso.id}
                    onClick={() => {
                      setActiveInciso(inciso.id);
                      setOpenItemId(null);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-bold">{inciso.title}</span>
                      <span className={`text-xs ${isActive ? 'text-green-600' : 'text-gray-500'}`}>{inciso.desc}</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      pontos > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {pontos} pts
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Coluna Direita (Área de Trabalho) */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Inciso {activeInciso}</h2>
              <p className="text-gray-500">{incisos.find(i => i.id === activeInciso)?.desc}</p>
            </div>

            <div className="space-y-4">
              {activeItems.length > 0 ? (
                activeItems.map((item) => (
                  <UploadCard
                    key={item.id}
                    item={item}
                    isOpen={openItemId === item.id}
                    onToggle={() => setOpenItemId(openItemId === item.id ? null : item.id)}
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Nenhum item disponível</h3>
                  <p className="text-gray-500">Não há itens cadastrados para este inciso no momento.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
