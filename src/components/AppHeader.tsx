import React from 'react';
import { ChevronRight, HardDrive, Menu } from 'lucide-react';
import { formatPointValue } from '../lib/points';
import { useAppContext } from '../context/AppContext';

interface AppHeaderProps {
  secondaryContent?: React.ReactNode;
  onOpenMenu?: () => void;
  hideAutoSave?: boolean;
}

export default function AppHeader({
  secondaryContent,
  onOpenMenu,
  hideAutoSave = false,
}: AppHeaderProps) {
  const { processo, lancamentos } = useAppContext();

  const totalPontos = lancamentos.reduce((acc, l) => acc + (l.pontos_calculados || 0), 0);
  const itensDistintos = new Set(lancamentos.map(l => l.item_rsc_id)).size;

  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-start gap-3 lg:flex-1 lg:items-center">
          <button
            type="button"
            onClick={onOpenMenu}
            className="mt-0.5 rounded-xl border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:divide-x lg:divide-gray-100">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400 sm:text-xs">
              <span>RSC</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-gray-900">Processo Ativo</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:pl-4">
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
        </div>

        <div className="flex w-full flex-col items-start gap-2 lg:w-auto lg:shrink-0 lg:items-end">
          {secondaryContent ? <div className="w-full lg:w-auto">{secondaryContent}</div> : null}

          {!hideAutoSave && <div className="group relative flex items-center self-center rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-gray-400 lg:self-auto">
            <HardDrive className="h-3.5 w-3.5" />
            <span className="ml-1.5 text-[10px] font-bold">AUTO-SAVE</span>
            <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 rounded-xl bg-gray-900 px-3.5 py-3 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
              <p className="mb-1 text-[11px] font-bold text-white">Salvamento local de segurança</p>
              <p className="text-[11px] leading-relaxed text-gray-300">
                Seus dados são gravados no cache do navegador. Para levar seu progresso para outro computador, exporte um backup no Dashboard.
              </p>
              <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900" />
            </div>
          </div>}
        </div>
      </div>
    </header>
  );
}
