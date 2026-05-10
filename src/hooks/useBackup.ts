import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';
import { exportSession } from '../lib/sessionExport';
import { importSession } from '../lib/sessionImport';

export function useBackup() {
  const { servidor, activeSessionId, restoreSession } = useAppContext();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExportSession = async () => {
    if (!activeSessionId) return;
    setIsExporting(true);
    try {
      await exportSession(activeSessionId);
      toast.success('Backup salvo com sucesso!');
    } catch {
      toast.error('Erro ao exportar o progresso. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSession = async (file: File) => {
    setIsImporting(true);
    try {
      const session = await importSession(file, servidor?.id);
      restoreSession(session);
      toast.success('Progresso restaurado com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Arquivo inválido.';
      toast.error(`Erro ao restaurar: ${message}`);
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  return {
    isExporting,
    isImporting,
    importInputRef,
    handleExportSession,
    handleImportSession,
  };
}
