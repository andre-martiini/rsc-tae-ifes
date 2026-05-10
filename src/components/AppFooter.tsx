import React from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { useBackup } from '../hooks/useBackup';

export default function AppFooter() {
  const { isExporting, isImporting, importInputRef, handleExportSession, handleImportSession } = useBackup();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/80 p-3 backdrop-blur-md lg:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isExporting}
          onClick={handleExportSession}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white/50 px-4 py-2.5 text-[11px] font-bold text-gray-600 shadow-inner transition-all hover:bg-white hover:text-primary active:scale-95 disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          <span className="uppercase tracking-widest">Salvar</span>
        </button>

        <button
          type="button"
          disabled={isImporting}
          onClick={() => importInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white/50 px-4 py-2.5 text-[11px] font-bold text-gray-600 shadow-inner transition-all hover:bg-white hover:text-primary active:scale-95 disabled:opacity-50"
        >
          {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          <span className="uppercase tracking-widest">Restaurar</span>
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
