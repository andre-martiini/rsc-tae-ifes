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
      const { documentosSemArquivo } = await exportSession(activeSessionId);
      if (documentosSemArquivo.length > 0) {
        toast.warning(
          `Backup salvo, mas ${documentosSemArquivo.length} documento(s) não puderam ser incluídos: ${documentosSemArquivo.join(', ')}. Reenvie-os depois de restaurar este backup.`,
          { duration: 12000 },
        );
      } else {
        toast.success('Backup salvo com sucesso!');
      }
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
      if (session.documentosNaoRestaurados.length > 0) {
        toast.warning(
          `Progresso restaurado, mas ${session.documentosNaoRestaurados.length} documento(s) não estavam no backup: ${session.documentosNaoRestaurados.join(', ')}. Será preciso reenviá-los.`,
          { duration: 12000 },
        );
      } else {
        toast.success('Progresso restaurado com sucesso!');
      }
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
