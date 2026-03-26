import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Servidor, ItemRSC, Documento, Lancamento, mockServidor, mockItensRSC, mockDocumentos, mockLancamentos } from '../data/mock';

interface AppContextType {
  servidor: Servidor | null;
  itensRSC: ItemRSC[];
  documentos: Documento[];
  lancamentos: Lancamento[];
  login: (siapeOrEmail: string) => boolean;
  logout: () => void;
  addLancamento: (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => void;
  addDocumento: (doc: Omit<Documento, 'id' | 'data_upload'>) => Documento;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [servidor, setServidor] = useState<Servidor | null>(null);
  const [itensRSC] = useState<ItemRSC[]>(mockItensRSC);
  const [documentos, setDocumentos] = useState<Documento[]>(mockDocumentos);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(mockLancamentos);

  const login = (siapeOrEmail: string) => {
    if (siapeOrEmail === mockServidor.siape || siapeOrEmail === mockServidor.email_institucional) {
      setServidor(mockServidor);
      return true;
    }
    return false;
  };

  const logout = () => {
    setServidor(null);
  };

  const addDocumento = (doc: Omit<Documento, 'id' | 'data_upload'>) => {
    const newDoc: Documento = {
      ...doc,
      id: `doc-${Date.now()}`,
      data_upload: new Date().toISOString(),
    };
    setDocumentos([...documentos, newDoc]);
    return newDoc;
  };

  const addLancamento = (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => {
    const newLancamento: Lancamento = {
      ...lancamento,
      id: `lanc-${Date.now()}`,
      status_auditoria: 'Pendente',
    };
    setLancamentos([...lancamentos, newLancamento]);
  };

  return (
    <AppContext.Provider value={{ servidor, itensRSC, documentos, lancamentos, login, logout, addLancamento, addDocumento }}>
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
