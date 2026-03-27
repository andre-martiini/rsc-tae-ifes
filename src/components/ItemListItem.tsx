import React from 'react';
import { ItemRSC } from '../data/mock';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
      className={`w-full text-left rounded-xl transition-all duration-300 relative group border ${
        isActive 
          ? 'bg-primary/5 border-primary/20 shadow-sm' 
          : 'bg-white border-transparent hover:bg-gray-50'
      } ${isCollapsed ? 'p-2.5' : 'p-4 pr-3'}`}
    >
      <div className={`flex ${isCollapsed ? 'justify-center' : 'items-start gap-4'}`}>
        <div className={`${isCollapsed ? 'mt-0 h-11 w-11 text-xs' : 'mt-1 w-8 h-8 text-[10px]'} font-mono font-black rounded-lg flex items-center justify-center transition-colors shadow-sm ${
          isActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
        }`}>
          {item.numero}
        </div>
        {!isCollapsed && (
          <div className="flex-1 overflow-hidden">
            <h4 className={`text-sm font-bold leading-tight transition-colors line-clamp-2 ${
              isActive ? 'text-primary' : 'text-gray-900 group-hover:text-primary/80'
            }`}>
              {item.descricao}
            </h4>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] font-medium text-gray-500 leading-relaxed line-clamp-2">
                {item.unidade_medida}
              </span>
              {isFragile && (
                <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                  <span className="text-[10px] font-black">JURÍDICO</span>
                </div>
              )}
              {hasLancamentos && (
                <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100/50">
                  <span className="text-[10px] font-black">+{pontos} pts</span>
                </div>
              )}
            </div>
          </div>
        )}
        {!isCollapsed && (
          <ChevronRight className={`w-4 h-4 mt-2 transition-all duration-300 ${
            isActive ? 'text-primary translate-x-1' : 'text-gray-300 group-hover:translate-x-0.5'
          }`}>
          </ChevronRight>
        )}
      </div>
      
      {isActive && (
        <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-primary rounded-full shadow-[0_0_8px_rgba(22,163,74,0.4)]"></div>
      )}
    </motion.button>
  );
}
