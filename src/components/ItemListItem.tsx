import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ItemRSC } from '../data/mock';
import { formatPointValue } from '../lib/points';

interface ItemListItemProps {
  key?: React.Key;
  item: ItemRSC;
  isActive: boolean;
  onClick: () => void;
  hasLancamentos: boolean;
  pontos: number;
  isCollapsed?: boolean;
  isFragile?: boolean;
}

export default function ItemListItem({
  item,
  isActive,
  onClick,
  hasLancamentos,
  pontos,
  isCollapsed = false,
  isFragile = false,
}: ItemListItemProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      title={isCollapsed ? `${item.numero} - ${item.descricao}` : undefined}
      className={`relative w-full rounded-xl border text-left transition-all duration-300 ${
        isActive ? 'border-primary/20 bg-primary/5 shadow-sm' : 'border-transparent bg-white hover:bg-gray-50'
      } ${isCollapsed ? 'p-2.5' : 'p-4 pr-3'}`}
    >
      <div className={`flex ${isCollapsed ? 'justify-center' : 'items-start gap-4'}`}>
        <div className={`${isCollapsed ? 'mt-0 h-11 w-11 text-xs' : 'mt-1 h-8 w-8 text-[10px]'} flex items-center justify-center rounded-lg font-mono font-black shadow-sm transition-colors ${
          isActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
        }`}>
          {item.numero}
        </div>

        {!isCollapsed && (
          <div className="flex-1 overflow-hidden">
            <h4 className={`line-clamp-2 text-sm font-bold leading-tight transition-colors ${
              isActive ? 'text-primary' : 'text-gray-900 group-hover:text-primary/80'
            }`}>
              {item.descricao}
            </h4>
            <div className="mt-2 flex items-center gap-2">
              <span className="line-clamp-2 text-[11px] font-medium leading-relaxed text-gray-500">
                {item.unidade_medida}
              </span>
              {isFragile && (
                <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                  <span className="text-[10px] font-black">JURIDICO</span>
                </div>
              )}
              {hasLancamentos && (
                <div className="flex items-center gap-1 rounded-full border border-green-100/50 bg-green-50 px-2 py-0.5 text-green-700">
                  <span className="text-[10px] font-black">+{formatPointValue(pontos)} pts</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!isCollapsed && (
          <ChevronRight className={`mt-2 h-4 w-4 transition-all duration-300 ${
            isActive ? 'translate-x-1 text-primary' : 'text-gray-300 group-hover:translate-x-0.5'
          }`} />
        )}
      </div>

      {isActive && (
        <div className="absolute left-[-2px] top-1/2 h-3/4 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(22,163,74,0.4)]"></div>
      )}
    </motion.button>
  );
}
