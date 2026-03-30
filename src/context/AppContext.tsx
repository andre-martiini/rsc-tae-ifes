import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  Servidor,
  SystemUser,
  ItemRSC,
  Documento,
  Lancamento,
  ProcessoRSC,
  mockItensRSC,
  mockDocumentos,
  mockLancamentos,
  mockProcessoRSC,
} from '../data/mock';
import { persistDocumentFile, persistDocumentBlob } from '../lib/documentStorage';
import {
  loadServidores,
  saveServidores,
  loadSystemUsers,
  saveSystemUsers,
} from '../lib/userStorage';

interface AppContextType {
  servidor: Servidor | null;
  servidores: Servidor[];
  systemUsers: SystemUser[];
  itensRSC: ItemRSC[];
  documentos: Documento[];
  lancamentos: Lancamento[];
  processo: ProcessoRSC;
  wizardRecommendedIds: string[];
  login: (siapeOrEmail: string) => boolean;
  logout: () => void;
  createServidor: (data: Omit<Servidor, 'id'>) => Servidor;
  createSystemUser: (data: Omit<SystemUser, 'id'>) => SystemUser;
  addLancamento: (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => boolean;
  removeLancamento: (lancamentoId: string) => boolean;
  addDocumento: (doc: Omit<Documento, 'id' | 'data_upload'>) => Documento;
  addDocumentoFromFile: (params: { servidorId: string; file: File }) => Promise<Documento>;
  addDocumentoFromGedocLinks: (params: { servidorId: string; links: string[] }) => Promise<Documento>;
  submitProcess: (payload: Omit<ProcessoRSC, 'status' | 'submitted_at'>) => void;
  setWizardRecommendedIds: (ids: string[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  documentos: 'rsc-tae-documentos',
  lancamentos: 'rsc-tae-lancamentos',
  processo: 'rsc-tae-processo',
  wizardIds: 'rsc-tae-wizard-ids',
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
  const [servidores, setServidores] = useState<Servidor[]>(() => loadServidores());
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(() => loadSystemUsers());
  const [servidor, setServidor] = useState<Servidor | null>(null);
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
  const [wizardRecommendedIds, setWizardRecommendedIds] = useState<string[]>(() =>
    loadStoredValue(STORAGE_KEYS.wizardIds, []),
  );

  useEffect(() => {
    saveServidores(servidores);
  }, [servidores]);

  useEffect(() => {
    saveSystemUsers(systemUsers);
  }, [systemUsers]);

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

  const login = (siapeOrEmail: string) => {
    const normalized = siapeOrEmail.trim().toLowerCase();
    const found = servidores.find(
      (s) =>
        s.siape === normalized ||
        s.siape === siapeOrEmail.trim() ||
        s.email_institucional.toLowerCase() === normalized,
    );

    if (found) {
      setServidor(found);
      return true;
    }

    return false;
  };

  const logout = () => {
    setServidor(null);
  };

  const createServidor = (data: Omit<Servidor, 'id'>) => {
    const newServidor: Servidor = {
      ...data,
      id: `srv-${Date.now()}`,
    };
    setServidores((current) => [...current, newServidor]);
    return newServidor;
  };

  const createSystemUser = (data: Omit<SystemUser, 'id'>) => {
    const newUser: SystemUser = {
      ...data,
      id: `usr-${Date.now()}`,
    };
    setSystemUsers((current) => [...current, newUser]);
    return newUser;
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

  const addDocumentoFromGedocLinks = async ({ servidorId, links }: { servidorId: string; links: string[] }): Promise<Documento> => {
    const { PDFDocument } = await import('pdf-lib');

    const toProxyUrl = (url: string) => {
      const parsed = new URL(url);
      return `/proxy/gedoc${parsed.pathname}${parsed.search}`;
    };

    const pdfBuffers = await Promise.all(
      links.map(async (url) => {
        const response = await fetch(toProxyUrl(url));
        if (!response.ok) throw new Error(`Falha ao buscar documento: ${url}`);
        return response.arrayBuffer();
      }),
    );

    const mergedDoc = await PDFDocument.create();
    for (const buffer of pdfBuffers) {
      const sourcePdf = await PDFDocument.load(buffer);
      const copiedPages = await mergedDoc.copyPages(sourcePdf, sourcePdf.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    const mergedBytes = await mergedDoc.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    const docId = `doc-${Date.now()}`;
    const nomeArquivo = `gedoc-mesclado-${links.length}-doc${links.length > 1 ? 's' : ''}.pdf`;
    const persisted = await persistDocumentBlob({ docId, servidorId, nomeArquivo, blob });

    const newDoc: Documento = {
      id: docId,
      servidor_id: servidorId,
      nome_arquivo: nomeArquivo,
      hash_arquivo: persisted.hash,
      caminho_storage: persisted.caminhoStorage,
      mime_type: 'application/pdf',
      tamanho_bytes: persisted.tamanhoBytes,
      data_upload: new Date().toISOString(),
      gedoc_links: links,
    };

    setDocumentos((current) => [...current, newDoc]);
    return newDoc;
  };

  const addLancamento = (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => {
    if (processo.status === 'Em triagem') {
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
    if (processo.status === 'Em triagem') {
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
      status: 'Em triagem',
      submitted_at: new Date().toISOString(),
    });
  };

  return (
    <AppContext.Provider
      value={{
        servidor,
        servidores,
        systemUsers,
        itensRSC,
        documentos,
        lancamentos,
        processo,
        login,
        logout,
        createServidor,
        createSystemUser,
        addLancamento,
        removeLancamento,
        addDocumento,
        addDocumentoFromFile,
        addDocumentoFromGedocLinks,
        submitProcess,
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
