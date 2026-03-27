import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  Servidor,
  ItemRSC,
  Documento,
  Lancamento,
  ProcessoRSC,
  mockServidor,
  mockItensRSC,
  mockDocumentos,
  mockLancamentos,
  mockProcessoRSC,
} from '../data/mock';
import { persistDocumentFile } from '../lib/documentStorage';

interface AppContextType {
  servidor: Servidor | null;
  itensRSC: ItemRSC[];
  documentos: Documento[];
  lancamentos: Lancamento[];
  processo: ProcessoRSC;
  login: (siapeOrEmail: string) => boolean;
  logout: () => void;
  addLancamento: (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => boolean;
  removeLancamento: (lancamentoId: string) => boolean;
  addDocumento: (doc: Omit<Documento, 'id' | 'data_upload'>) => Documento;
  addDocumentoFromFile: (params: { servidorId: string; file: File }) => Promise<Documento>;
  submitProcess: (payload: Omit<ProcessoRSC, 'status' | 'submitted_at'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  documentos: 'rsc-tae-documentos',
  lancamentos: 'rsc-tae-lancamentos',
  processo: 'rsc-tae-processo',
};

function loadStoredValue<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [servidor, setServidor] = useState<Servidor | null>(mockServidor);
  const [itensRSC] = useState<ItemRSC[]>(mockItensRSC);
  const [documentos, setDocumentos] = useState<Documento[]>(() =>
    loadStoredValue(STORAGE_KEYS.documentos, mockDocumentos),
  );
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(() =>
    loadStoredValue(STORAGE_KEYS.lancamentos, mockLancamentos),
  );
  const [processo, setProcesso] = useState<ProcessoRSC>(() =>
    loadStoredValue(STORAGE_KEYS.processo, mockProcessoRSC),
  );

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

  const login = (_siapeOrEmail: string) => {
    setServidor(mockServidor);
    return true;
  };

  const logout = () => {
    setServidor(mockServidor);
  };

  const addDocumento = (doc: Omit<Documento, 'id' | 'data_upload'>) => {
    const newDoc: Documento = {
      ...doc,
      id: `doc-${Date.now()}`,
      data_upload: new Date().toISOString(),
    };
    setDocumentos((currentDocs) => [...currentDocs, newDoc]);
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

    setDocumentos((currentDocs) => [...currentDocs, newDoc]);
    return newDoc;
  };

  const addLancamento = (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => {
    if (processo.status === 'Enviado') {
      return false;
    }

    const newLancamento: Lancamento = {
      ...lancamento,
      id: `lanc-${Date.now()}`,
      status_auditoria: 'Pendente',
    };
    setLancamentos((currentLancamentos) => [...currentLancamentos, newLancamento]);
    return true;
  };

  const removeLancamento = (lancamentoId: string) => {
    if (processo.status === 'Enviado') {
      return false;
    }

    let removed = false;

    setLancamentos((currentLancamentos) => {
      const nextLancamentos = currentLancamentos.filter((lancamento) => {
        const shouldKeep = lancamento.id !== lancamentoId;
        if (!shouldKeep) {
          removed = true;
        }
        return shouldKeep;
      });

      return nextLancamentos;
    });

    return removed;
  };

  const submitProcess = (payload: Omit<ProcessoRSC, 'status' | 'submitted_at'>) => {
    setProcesso({
      ...payload,
      status: 'Enviado',
      submitted_at: new Date().toISOString(),
    });
  };

  return (
    <AppContext.Provider
      value={{
        servidor,
        itensRSC,
        documentos,
        lancamentos,
        processo,
        login,
        logout,
        addLancamento,
        removeLancamento,
        addDocumento,
        addDocumentoFromFile,
        submitProcess,
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
