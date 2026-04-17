import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  Servidor,
  ItemRSC,
  Documento,
  Lancamento,
  ProcessoRSC,
  mockItensRSC,
} from '../data/mock';
import { buildInstitutionReferenceFileName } from '../config/institution';
import {
  persistDocumentFile,
  persistDocumentBlob,
  deleteDocumentsByServidorId,
  computeDocumentHash,
} from '../lib/documentStorage';
import type { RestoredSession } from '../lib/sessionImport';

// ── Session types ─────────────────────────────────────────────────────────────

export interface SessionSummary {
  id: string;
  siape: string;
  nome_completo: string;
  created_at: string;
  updated_at: string;
}

// ── Storage key helpers ───────────────────────────────────────────────────────

const GLOBAL_KEYS = {
  sessions: 'rsc-tae-sessions',
  active: 'rsc-tae-active',
};

export function sessionKeys(id: string) {
  return {
    perfil: `rsc-tae-${id}-perfil`,
    documentos: `rsc-tae-${id}-documentos`,
    lancamentos: `rsc-tae-${id}-lancamentos`,
    processo: `rsc-tae-${id}-processo`,
    wizardIds: `rsc-tae-${id}-wizard-ids`,
  };
}

// Old flat keys — used only for migration
const OLD_KEYS = {
  perfil: 'rsc-tae-perfil',
  documentos: 'rsc-tae-documentos',
  lancamentos: 'rsc-tae-lancamentos',
  processo: 'rsc-tae-processo',
  wizardIds: 'rsc-tae-wizard-ids',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeFactIdentifier(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Migrate pre-multi-session data (flat keys) to the new format.
// Returns a SessionSummary[] to seed the sessions index, or [] if nothing to migrate.
function migrateOldSession(): SessionSummary[] {
  const oldPerfil = loadJson<Servidor | null>(OLD_KEYS.perfil, null);
  if (!oldPerfil) return [];

  const id = oldPerfil.id || `srv-${Date.now()}`;
  const keys = sessionKeys(id);

  window.localStorage.setItem(keys.perfil, JSON.stringify(oldPerfil));

  const docRaw = window.localStorage.getItem(OLD_KEYS.documentos);
  if (docRaw) window.localStorage.setItem(keys.documentos, docRaw);

  const lancRaw = window.localStorage.getItem(OLD_KEYS.lancamentos);
  if (lancRaw) window.localStorage.setItem(keys.lancamentos, lancRaw);

  const procRaw = window.localStorage.getItem(OLD_KEYS.processo);
  if (procRaw) window.localStorage.setItem(keys.processo, procRaw);

  const wizRaw = window.localStorage.getItem(OLD_KEYS.wizardIds);
  if (wizRaw) window.localStorage.setItem(keys.wizardIds, wizRaw);

  // Clean up old flat keys
  Object.values(OLD_KEYS).forEach((k) => window.localStorage.removeItem(k));

  const now = new Date().toISOString();
  return [
    {
      id,
      siape: oldPerfil.siape,
      nome_completo: oldPerfil.nome_completo,
      created_at: now,
      updated_at: now,
    },
  ];
}

// ── Context type ──────────────────────────────────────────────────────────────

interface AppContextType {
  servidor: Servidor | null;
  activeSessionId: string | null;
  sessions: SessionSummary[];
  itensRSC: ItemRSC[];
  documentos: Documento[];
  lancamentos: Lancamento[];
  processo: ProcessoRSC;
  wizardRecommendedIds: string[];
  createSession: (perfil: Servidor) => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
  setPerfil: (data: Servidor) => void;
  updateProcesso: (updates: Partial<ProcessoRSC>) => void;
  restoreSession: (session: RestoredSession) => void;
  importSessionAsNew: (session: RestoredSession) => void;
  addLancamento: (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => boolean;
  removeLancamento: (lancamentoId: string) => boolean;
  addDocumento: (doc: Omit<Documento, 'id' | 'data_upload'>) => Documento;
  addDocumentoFromFile: (params: {
    servidorId: string;
    file: File;
    tipoDocumento?: Documento['tipo_documento'];
    sourceName?: string;
    sourceMimeType?: string;
    convertedToPdf?: boolean;
    transcription?: string;
  }) => Promise<Documento>;
  addDocumentoFromGedocLinks: (params: {
    servidorId: string;
    links: string[];
    tipoDocumento?: Documento['tipo_documento'];
  }) => Promise<Documento>;
  updateDocumento: (docId: string, updates: Partial<Documento>) => void;
  setWizardRecommendedIds: (ids: string[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

const INITIAL_PROCESSO: ProcessoRSC = { status: 'Rascunho' };

export function AppProvider({ children }: { children: ReactNode }) {
  // ── Sessions index ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<SessionSummary[]>(() => {
    let stored = loadJson<SessionSummary[]>(GLOBAL_KEYS.sessions, []);
    if (stored.length === 0) {
      // Attempt migration from old flat keys
      stored = migrateOldSession();
      if (stored.length > 0) {
        window.localStorage.setItem(GLOBAL_KEYS.sessions, JSON.stringify(stored));
        window.localStorage.setItem(GLOBAL_KEYS.active, stored[0].id);
      }
    }
    return stored;
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() =>
    window.localStorage.getItem(GLOBAL_KEYS.active),
  );

  // ── Active session data ─────────────────────────────────────────────────────
  const [servidor, setServidor] = useState<Servidor | null>(() => {
    const id = window.localStorage.getItem(GLOBAL_KEYS.active);
    return id ? loadJson<Servidor | null>(`rsc-tae-${id}-perfil`, null) : null;
  });

  const [documentos, setDocumentos] = useState<Documento[]>(() => {
    const id = window.localStorage.getItem(GLOBAL_KEYS.active);
    return id ? loadJson<Documento[]>(`rsc-tae-${id}-documentos`, []) : [];
  });

  const [lancamentos, setLancamentos] = useState<Lancamento[]>(() => {
    const id = window.localStorage.getItem(GLOBAL_KEYS.active);
    return id ? loadJson<Lancamento[]>(`rsc-tae-${id}-lancamentos`, []) : [];
  });

  const [processo, setProcesso] = useState<ProcessoRSC>(() => {
    const id = window.localStorage.getItem(GLOBAL_KEYS.active);
    return id ? loadJson<ProcessoRSC>(`rsc-tae-${id}-processo`, INITIAL_PROCESSO) : INITIAL_PROCESSO;
  });

  const [wizardRecommendedIds, setWizardRecommendedIds] = useState<string[]>(() => {
    const id = window.localStorage.getItem(GLOBAL_KEYS.active);
    return id ? loadJson<string[]>(`rsc-tae-${id}-wizard-ids`, []) : [];
  });

  const [itensRSC] = useState<ItemRSC[]>(mockItensRSC);

  // ── Persistence effects ─────────────────────────────────────────────────────

  useEffect(() => {
    window.localStorage.setItem(GLOBAL_KEYS.sessions, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      window.localStorage.setItem(GLOBAL_KEYS.active, activeSessionId);
    } else {
      window.localStorage.removeItem(GLOBAL_KEYS.active);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) return;
    const key = `rsc-tae-${activeSessionId}-perfil`;
    if (servidor) {
      window.localStorage.setItem(key, JSON.stringify(servidor));
      // Keep session summary in sync
      setSessions((prev) => {
        const target = prev.find((s) => s.id === activeSessionId);
        if (
          target &&
          target.siape === servidor.siape &&
          target.nome_completo === servidor.nome_completo
        ) {
          return prev; // no change
        }
        return prev.map((s) =>
          s.id === activeSessionId
            ? {
              ...s,
              siape: servidor.siape,
              nome_completo: servidor.nome_completo,
              updated_at: new Date().toISOString(),
            }
            : s,
        );
      });
    } else {
      window.localStorage.removeItem(key);
    }
  }, [servidor, activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) return;
    window.localStorage.setItem(`rsc-tae-${activeSessionId}-documentos`, JSON.stringify(documentos));
  }, [documentos, activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) return;
    window.localStorage.setItem(`rsc-tae-${activeSessionId}-lancamentos`, JSON.stringify(lancamentos));
  }, [lancamentos, activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) return;
    window.localStorage.setItem(`rsc-tae-${activeSessionId}-processo`, JSON.stringify(processo));
  }, [processo, activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) return;
    window.localStorage.setItem(`rsc-tae-${activeSessionId}-wizard-ids`, JSON.stringify(wizardRecommendedIds));
  }, [wizardRecommendedIds, activeSessionId]);

  // ── Session actions ─────────────────────────────────────────────────────────

  const createSession = (perfil: Servidor) => {
    const id = perfil.id;
    const now = new Date().toISOString();
    const summary: SessionSummary = {
      id,
      siape: perfil.siape,
      nome_completo: perfil.nome_completo,
      created_at: now,
      updated_at: now,
    };

    // Persist immediately so effects are consistent on first render
    const keys = sessionKeys(id);
    window.localStorage.setItem(keys.perfil, JSON.stringify(perfil));
    window.localStorage.setItem(keys.documentos, JSON.stringify([]));
    window.localStorage.setItem(keys.lancamentos, JSON.stringify([]));
    window.localStorage.setItem(keys.processo, JSON.stringify(INITIAL_PROCESSO));
    window.localStorage.setItem(keys.wizardIds, JSON.stringify([]));
    window.localStorage.setItem(GLOBAL_KEYS.active, id);

    setSessions((prev) => [...prev, summary]);
    setActiveSessionId(id);
    setServidor(perfil);
    setDocumentos([]);
    setLancamentos([]);
    setProcesso(INITIAL_PROCESSO);
    setWizardRecommendedIds([]);
  };

  const loadSession = (id: string) => {
    const keys = sessionKeys(id);
    window.localStorage.setItem(GLOBAL_KEYS.active, id);
    setActiveSessionId(id);
    setServidor(loadJson<Servidor | null>(keys.perfil, null));
    setDocumentos(loadJson<Documento[]>(keys.documentos, []));
    setLancamentos(loadJson<Lancamento[]>(keys.lancamentos, []));
    setProcesso(loadJson<ProcessoRSC>(keys.processo, INITIAL_PROCESSO));
    setWizardRecommendedIds(loadJson<string[]>(keys.wizardIds, []));
  };

  const deleteSession = async (id: string) => {
    const keys = sessionKeys(id);
    const sessionPerfil = loadJson<Servidor | null>(keys.perfil, null);

    // Remove all session-scoped localStorage keys
    Object.values(keys).forEach((k) => window.localStorage.removeItem(k));

    // Remove from sessions index
    setSessions((prev) => prev.filter((s) => s.id !== id));

    // If this was the active session, clear in-memory state
    if (activeSessionId === id) {
      window.localStorage.removeItem(GLOBAL_KEYS.active);
      setActiveSessionId(null);
      setServidor(null);
      setDocumentos([]);
      setLancamentos([]);
      setProcesso(INITIAL_PROCESSO);
      setWizardRecommendedIds([]);
    }

    // Clean up IndexedDB blobs for this session
    if (sessionPerfil) {
      await deleteDocumentsByServidorId(sessionPerfil.id);
    }
  };

  const setPerfil = (data: Servidor) => {
    setServidor(data);
  };

  const updateProcesso = useCallback((updates: Partial<ProcessoRSC>) => {
    setProcesso((current) => ({ ...current, ...updates }));
  }, []);

  const restoreSession = (session: RestoredSession) => {
    if (!activeSessionId) return;
    setServidor(session.perfil);
    setDocumentos(session.documentos);
    setLancamentos(session.lancamentos);
    setProcesso(session.processo ?? INITIAL_PROCESSO);
    setWizardRecommendedIds(session.wizardIds);
  };

  const importSessionAsNew = (restored: RestoredSession) => {
    if (!restored.perfil) return;
    const id = restored.perfil.id;
    const now = new Date().toISOString();
    const summary: SessionSummary = {
      id,
      siape: restored.perfil.siape,
      nome_completo: restored.perfil.nome_completo,
      created_at: now,
      updated_at: now,
    };

    const keys = sessionKeys(id);
    window.localStorage.setItem(keys.perfil, JSON.stringify(restored.perfil));
    window.localStorage.setItem(keys.documentos, JSON.stringify(restored.documentos));
    window.localStorage.setItem(keys.lancamentos, JSON.stringify(restored.lancamentos));
    window.localStorage.setItem(keys.processo, JSON.stringify(restored.processo ?? INITIAL_PROCESSO));
    window.localStorage.setItem(keys.wizardIds, JSON.stringify(restored.wizardIds));
    window.localStorage.setItem(GLOBAL_KEYS.active, id);

    setSessions((prev) => {
      if (prev.some((s) => s.id === id)) {
        return prev.map((s) => (s.id === id ? summary : s));
      }
      return [...prev, summary];
    });

    setActiveSessionId(id);
    setServidor(restored.perfil);
    setDocumentos(restored.documentos);
    setLancamentos(restored.lancamentos);
    setProcesso(restored.processo ?? INITIAL_PROCESSO);
    setWizardRecommendedIds(restored.wizardIds);
  };

  // ── Document & lançamento actions ────────────────────────────────────────────

  const addDocumento = (doc: Omit<Documento, 'id' | 'data_upload'>) => {
    const newDoc: Documento = {
      ...doc,
      id: `doc-${Date.now()}`,
      tipo_documento: doc.tipo_documento ?? 'comprobatorio_principal',
      data_upload: new Date().toISOString(),
    };
    setDocumentos((current) => [...current, newDoc]);
    return newDoc;
  };

  const addDocumentoFromFile = async ({
    servidorId,
    file,
    tipoDocumento,
    sourceName,
    sourceMimeType,
    convertedToPdf,
    transcription,
  }: {
    servidorId: string;
    file: File;
    tipoDocumento?: Documento['tipo_documento'];
    sourceName?: string;
    sourceMimeType?: string;
    convertedToPdf?: boolean;
    transcription?: string;
  }) => {
    const fileHash = await computeDocumentHash(file);
    const normalizedName = normalizeFileName(file.name);

    const duplicatedDocument = documentos.find((doc) => {
      if (doc.servidor_id !== servidorId || !doc.caminho_storage) {
        return false;
      }

      if (doc.hash_arquivo && doc.hash_arquivo === fileHash) {
        return true;
      }

      return (
        normalizeFileName(doc.nome_arquivo) === normalizedName &&
        doc.tamanho_bytes === file.size
      );
    });

    if (duplicatedDocument) {
      if (transcription && !duplicatedDocument.transcricao) {
        updateDocumento(duplicatedDocument.id, { transcricao: transcription });
      }
      return { ...duplicatedDocument, transcricao: transcription || duplicatedDocument.transcricao };
    }

    const docId = `doc-${Date.now()}`;
    const persistedFile = await persistDocumentFile({ docId, servidorId, file });

    const newDoc: Documento = {
      id: docId,
      servidor_id: servidorId,
      nome_arquivo: file.name,
      tipo_documento: tipoDocumento ?? 'comprobatorio_principal',
      hash_arquivo: persistedFile.hash,
      caminho_storage: persistedFile.caminhoStorage,
      mime_type: persistedFile.mimeType,
      tamanho_bytes: persistedFile.tamanhoBytes,
      data_upload: new Date().toISOString(),
      convertido_para_pdf: convertedToPdf || undefined,
      arquivo_origem_nome: sourceName,
      arquivo_origem_mime: sourceMimeType,
      transcricao: transcription,
    };

    setDocumentos((current) => [...current, newDoc]);
    return newDoc;
  };

  const addDocumentoFromGedocLinks = async ({
    servidorId,
    links,
    tipoDocumento,
  }: {
    servidorId: string;
    links: string[];
    tipoDocumento?: Documento['tipo_documento'];
  }): Promise<Documento> => {
    const docId = `doc-${Date.now()}`;
    const nomeArquivo = buildInstitutionReferenceFileName(links.length);

    const newDoc: Documento = {
      id: docId,
      servidor_id: servidorId,
      nome_arquivo: nomeArquivo,
      tipo_documento: tipoDocumento ?? 'referencia_institucional',
      data_upload: new Date().toISOString(),
      gedoc_links: links,
    };

    setDocumentos((current) => [...current, newDoc]);
    return newDoc;
  };

  const addLancamento = (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => {
    const normalizedFactId = normalizeFactIdentifier(lancamento.fato_gerador_id ?? '');
    if (!normalizedFactId) {
      throw new Error('Informe um identificador do fato gerador para este lançamento.');
    }

    const duplicateEntry = lancamentos.find(
      (entry) =>
        entry.servidor_id === lancamento.servidor_id &&
        normalizeFactIdentifier(entry.fato_gerador_id ?? '') === normalizedFactId,
    );

    if (duplicateEntry) {
      throw new Error(
        'Este fato gerador já foi utilizado em outro lançamento. Revise o identificador informado para evitar duplicidade.',
      );
    }

    const newLancamento: Lancamento = {
      ...lancamento,
      fato_gerador_id: lancamento.fato_gerador_id?.trim(),
      fato_gerador_descricao: lancamento.fato_gerador_descricao?.trim() || undefined,
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

  const updateDocumento = (docId: string, updates: Partial<Documento>) => {
    setDocumentos((current) =>
      current.map((doc) => (doc.id === docId ? { ...doc, ...updates } : doc))
    );
  };

  return (
    <AppContext.Provider
      value={{
        servidor,
        activeSessionId,
        sessions,
        itensRSC,
        documentos,
        lancamentos,
        processo,
        wizardRecommendedIds,
        createSession,
        loadSession,
        deleteSession,
        setPerfil,
        updateProcesso,
        restoreSession,
        importSessionAsNew,
        addLancamento,
        removeLancamento,
        addDocumento,
        addDocumentoFromFile,
        addDocumentoFromGedocLinks,
        updateDocumento,
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
