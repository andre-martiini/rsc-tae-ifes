import React from 'react';
import { CheckCircle2, ChevronRight, HardDrive, Info, Loader2 } from 'lucide-react';
import { formatPointValue } from '../lib/points';
import { useAppContext } from '../context/AppContext';

interface AppHeaderProps {
  secondaryContent?: React.ReactNode;
}

export default function AppHeader({
  secondaryContent,
}: AppHeaderProps) {
  const { processo, lancamentos, servidor } = useAppContext();

  const totalPontos = lancamentos.reduce((acc, l) => acc + (l.pontos_calculados || 0), 0);
  const itensDistintos = new Set(lancamentos.map(l => l.item_rsc_id)).size;

  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-8">
        <div className="flex items-center gap-4 divide-x divide-gray-100">
          {/* Breadcrumb or View Indicator (Placeholder for future) */}
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
            <span>RSC</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900">Processo Ativo</span>
          </div>

          <div className="flex items-center gap-4 pl-4 overflow-hidden">
            <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
              <span className="text-emerald-900">Total:</span> {formatPointValue(totalPontos)} pts
            </div>
            <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 shadow-sm">
              <span className="text-blue-900">Itens:</span> {itensDistintos}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-600">
              <span className="text-gray-400">Status:</span> {processo.status}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {secondaryContent}

          <div className="group relative flex items-center h-8 px-2.5 rounded-full border border-gray-100 bg-gray-50 text-gray-400">
            <HardDrive className="h-3.5 w-3.5" />
            <span className="ml-1.5 text-[10px] font-bold">AUTO-SAVE</span>
            <div className="pointer-events-none absolute top-full right-0 z-50 mt-2 w-64 rounded-xl bg-gray-900 px-3.5 py-3 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
              <p className="mb-1 text-[11px] font-bold text-white">Salvamento local de segurança</p>
              <p className="text-[11px] leading-relaxed text-gray-300">
                Seus dados são gravados no cache do navegador. Para levar seu progresso para outro computador, exporte um backup no Dashboard.
              </p>
              <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
