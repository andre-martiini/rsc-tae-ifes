import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  Servidor,
  ItemRSC,
  Documento,
  Lancamento,
  ProcessoRSC,
  mockItensRSC,
} from '../data/mock';
import { persistDocumentFile, persistDocumentBlob } from '../lib/documentStorage';
import type { RestoredSession } from '../lib/sessionImport';

interface AppContextType {
  servidor: Servidor | null;
  itensRSC: ItemRSC[];
  documentos: Documento[];
  lancamentos: Lancamento[];
  processo: ProcessoRSC;
  wizardRecommendedIds: string[];
  setPerfil: (data: Servidor) => void;
  restoreSession: (session: RestoredSession) => void;
  addLancamento: (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => boolean;
  removeLancamento: (lancamentoId: string) => boolean;
  addDocumento: (doc: Omit<Documento, 'id' | 'data_upload'>) => Documento;
  addDocumentoFromFile: (params: { servidorId: string; file: File }) => Promise<Documento>;
  addDocumentoFromGedocLinks: (params: { servidorId: string; links: string[] }) => Promise<Documento>;
  setWizardRecommendedIds: (ids: string[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  perfil: 'rsc-tae-perfil',
  documentos: 'rsc-tae-documentos',
  lancamentos: 'rsc-tae-lancamentos',
  processo: 'rsc-tae-processo',
  wizardIds: 'rsc-tae-wizard-ids',
};

function loadStoredValue<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') return fallback;
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

const INITIAL_PROCESSO: ProcessoRSC = { status: 'Rascunho' };

export function AppProvider({ children }: { children: ReactNode }) {
  const [servidor, setServidor] = useState<Servidor | null>(() =>
    loadStoredValue<Servidor | null>(STORAGE_KEYS.perfil, null),
  );
  const [itensRSC] = useState<ItemRSC[]>(mockItensRSC);
  const [documentos, setDocumentos] = useState<Documento[]>(() =>
    loadStoredValue<Documento[]>(STORAGE_KEYS.documentos, []),
  );
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(() =>
    loadStoredValue<Lancamento[]>(STORAGE_KEYS.lancamentos, []),
  );
  const [processo, setProcesso] = useState<ProcessoRSC>(() =>
    loadStoredValue<ProcessoRSC>(STORAGE_KEYS.processo, INITIAL_PROCESSO),
  );
  const [wizardRecommendedIds, setWizardRecommendedIds] = useState<string[]>(() =>
    loadStoredValue<string[]>(STORAGE_KEYS.wizardIds, []),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (servidor) {
      window.localStorage.setItem(STORAGE_KEYS.perfil, JSON.stringify(servidor));
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.perfil);
    }
  }, [servidor]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.documentos, JSON.stringify(documentos));
    }
  }, [documentos]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.lancamentos, JSON.stringify(lancamentos));
    }
  }, [lancamentos]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.processo, JSON.stringify(processo));
    }
  }, [processo]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.wizardIds, JSON.stringify(wizardRecommendedIds));
    }
  }, [wizardRecommendedIds]);

  const setPerfil = (data: Servidor) => {
    setServidor(data);
  };

  const restoreSession = (session: RestoredSession) => {
    setServidor(session.perfil);
    setDocumentos(session.documentos);
    setLancamentos(session.lancamentos);
    setProcesso(session.processo ?? INITIAL_PROCESSO);
    setWizardRecommendedIds(session.wizardIds);
  };

  const addDocumento = (doc: Omit<Documento, 'id' | 'data_upload'>) => {
    const newDoc: Documento = {
      ...doc,
      id: `doc-${Date.now()}`,
      data_upload: new Date().toISOString(),
    };
    setDocumentos((current) => [...current, newDoc]);
    return newDoc;
  };

  const addDocumentoFromFile = async ({ servidorId, file }: { servidorId: string; file: File }) => {
    const docId = `doc-${Date.now()}`;
    const persistedFile = await persistDocumentFile({ docId, servidorId, file });

    const newDoc: Documento = {
      id: docId,
      servidor_id: servidorId,
      nome_arquivo: file.name,
      hash_arquivo: persistedFile.hash,
      caminho_storage: persistedFile.caminhoStorage,
      mime_type: persistedFile.mimeType,
      tamanho_bytes: persistedFile.tamanhoBytes,
      data_upload: new Date().toISOString(),
    };

    setDocumentos((current) => [...current, newDoc]);
    return newDoc;
  };

  // GeDoc: sem proxy backend — armazena os links como referência de metadado apenas.
  // Os documentos não são baixados; o link aparece no relatório final para consulta manual.
  const addDocumentoFromGedocLinks = async ({
    servidorId,
    links,
  }: {
    servidorId: string;
    links: string[];
  }): Promise<Documento> => {
    const docId = `doc-${Date.now()}`;
    const nomeArquivo =
      links.length === 1
        ? `gedoc-referencia.ref`
        : `gedoc-referencias-${links.length}.ref`;

    const newDoc: Documento = {
      id: docId,
      servidor_id: servidorId,
      nome_arquivo: nomeArquivo,
      data_upload: new Date().toISOString(),
      gedoc_links: links,
    };

    setDocumentos((current) => [...current, newDoc]);
    return newDoc;
  };

  const addLancamento = (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => {
    const newLancamento: Lancamento = {
      ...lancamento,
      id: `lanc-${Date.now()}`,
      status_auditoria: 'Pendente',
    };
    setLancamentos((current) => [...current, newLancamento]);
    return true;
  };

  const removeLancamento = (lancamentoId: string) => {
    let removed = false;
    setLancamentos((current) => {
      const next = current.filter((l) => {
        const shouldKeep = l.id !== lancamentoId;
        if (!shouldKeep) removed = true;
        return shouldKeep;
      });
      return next;
    });
    return removed;
  };

  return (
    <AppContext.Provider
      value={{
        servidor,
        itensRSC,
        documentos,
        lancamentos,
        processo,
        setPerfil,
        restoreSession,
        addLancamento,
        removeLancamento,
        addDocumento,
        addDocumentoFromFile,
        addDocumentoFromGedocLinks,
        wizardRecommendedIds,
        setWizardRecommendedIds,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
