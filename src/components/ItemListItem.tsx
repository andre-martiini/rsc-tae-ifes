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
}

export default function ItemListItem({ item, isActive, onClick, hasLancamentos, pontos }: ItemListItemProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full text-left p-4 pr-3 rounded-xl transition-all duration-300 relative group border ${
        isActive 
          ? 'bg-primary/5 border-primary/20 shadow-sm' 
          : 'bg-white border-transparent hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`mt-1 font-mono text-[10px] font-black w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm ${
          isActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
        }`}>
          {item.numero}
        </div>
        <div className="flex-1 overflow-hidden">
          <h4 className={`text-sm font-bold leading-tight transition-colors line-clamp-2 ${
            isActive ? 'text-primary' : 'text-gray-900 group-hover:text-primary/80'
          }`}>
            {item.descricao}
          </h4>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {item.unidade_medida}s
            </span>
            {hasLancamentos && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100/50">
                <span className="text-[10px] font-black">+{pontos} pts</span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 mt-2 transition-all duration-300 ${
          isActive ? 'text-primary translate-x-1' : 'text-gray-300 group-hover:translate-x-0.5'
        }`} />
      </div>
      
      {isActive && (
        <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-primary rounded-full shadow-[0_0_8px_rgba(22,163,74,0.4)]"></div>
      )}
    </motion.button>
  );
}
