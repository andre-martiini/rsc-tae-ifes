import React from 'react';
import { Download, Upload, Loader2, MessageSquarePlus } from 'lucide-react';
import { useBackup } from '../hooks/useBackup';

export default function AppFooter() {
  const { isExporting, isImporting, importInputRef, handleExportSession, handleImportSession } = useBackup();

  const handleOpenFeedback = () => {
    window.dispatchEvent(new CustomEvent('open-feedback'));
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-100 bg-white h-[60px] px-3 flex items-center lg:hidden">
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          disabled={isExporting}
          onClick={handleExportSession}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-100 bg-white/50 px-2 py-2 text-[10px] font-bold text-gray-600 shadow-inner transition-all hover:bg-white hover:text-primary active:scale-95 disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          <span className="uppercase tracking-wider">Salvar</span>
        </button>

        <button
          type="button"
          disabled={isImporting}
          onClick={() => importInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-100 bg-white/50 px-2 py-2 text-[10px] font-bold text-gray-600 shadow-inner transition-all hover:bg-white hover:text-primary active:scale-95 disabled:opacity-50"
        >
          {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          <span className="uppercase tracking-wider">Restaurar</span>
        </button>

        <button
          type="button"
          onClick={handleOpenFeedback}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-100 bg-white/50 px-2 py-2 text-[10px] font-bold text-gray-600 shadow-inner transition-all hover:bg-white hover:text-primary active:scale-95"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider">Feedback</span>
        </button>

        <input
          ref={importInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportSession(f);
          }}
        />
      </div>
    </footer>
  );
}
