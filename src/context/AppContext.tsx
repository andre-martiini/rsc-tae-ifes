import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Servidor,
  ItemRSC,
  Documento,
  Lancamento,
  ProcessoRSC,
  mockItensRSC,
} from '../data/mock';
import type { EstadoTriagem, SugestaoTriagem } from '../data/triagem';
import type { EstadoAuditoria, OperacaoAuditoria, OperacaoParseada, OrigemAuditoria, TipoOperacao } from '../data/auditoria';
import { mergeOperacoesPorOrigem } from '../lib/auditoriaMerge';
import {
  buildInstitutionReferenceFileName,
  normalizeInstitutionDocumentLink,
} from '../config/institution';
import {
  persistDocumentFile,
  deleteDocumentsByServidorId,
  deleteDocumentFile,
  computeDocumentHash,
} from '../lib/documentStorage';
import type { RestoredSession } from '../lib/sessionImport';
import { normalizePointValue, calculateLancamentoPoints } from '../lib/points';
import { getLancamentoDocumentIds } from '../lib/documentOrdering';
import {
  periodosDoLancamento,
  totalDiasPeriodos,
  unidadesAnoFracao,
  unidadesMes,
  abrangenciaPeriodos,
} from '../lib/periodos';


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
    triagem: `rsc-tae-${id}-triagem`,
    auditoria: `rsc-tae-${id}-auditoria`,
    onboarding: `rsc-tae-${id}-onboarding-seen`,
    scoreMarginDismissedLevels: `rsc-tae-${id}-score-margin-dismissed-levels`,
  };
}

// Old flat keys — used only for migration
const OLD_KEYS = {
  perfil: 'rsc-tae-perfil',
  documentos: 'rsc-tae-documentos',
  lancamentos: 'rsc-tae-lancamentos',
  processo: 'rsc-tae-processo',
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

/** Remove dados de contato presentes em perfis ou backups de versões antigas. */
function sanitizeServidor(perfil: Servidor | null): Servidor | null {
  if (!perfil) return null;
  const {
    email_institucional: _emailInstitucional,
    telefone: _telefone,
    ...servidorSemContato
  } = perfil as Servidor & { email_institucional?: unknown; telefone?: unknown };
  return servidorSemContato;
}

/**
 * Migra estados de auditoria persistidos antes do módulo unificado: operações
 * sem `origem`/`criada_em` recebem defaults (só a Triagem persistia antes).
 */
function normalizeAuditoria(estado: EstadoAuditoria | null): EstadoAuditoria | null {
  if (!estado || !Array.isArray(estado.operacoes)) return estado;
  let mudou = false;
  const agora = new Date().toISOString();
  const operacoes = estado.operacoes.map((op) => {
    if (op.origem && op.criada_em) return op;
    mudou = true;
    return {
      ...op,
      origem: op.origem ?? ('triagem' as OrigemAuditoria),
      criada_em: op.criada_em ?? agora,
    };
  });
  return mudou ? { ...estado, operacoes } : estado;
}

function loadAuditoria(key: string): EstadoAuditoria | null {
  return normalizeAuditoria(loadJson<EstadoAuditoria | null>(key, null));
}

function normalizeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Sufixo aleatório é obrigatório: Date.now() sozinho colide quando vários
// lançamentos são criados no mesmo milissegundo (ex.: "Confirmar todas").
function gerarLancamentoId(): string {
  return `lanc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface MigrationStats {
  repontuados: number;
  zerados: number;
  idsDuplicados: number;
}

function migrateLancamento(l: Lancamento, stats?: MigrationStats): Lancamento {
  let updated = l;
  if (l.documento_id && !l.comprovantes_ids) {
    updated = { ...updated, comprovantes_ids: [l.documento_id] };
  }

  // Recalculate points based on current active items
  const item = mockItensRSC.find((i) => i.id === l.item_rsc_id);
  if (item) {
    const correctPoints = normalizePointValue(l.quantidade_informada * item.pontos_por_unidade);
    if (updated.pontos_calculados !== correctPoints) {
      if (stats) stats.repontuados += 1;
      updated = { ...updated, pontos_calculados: correctPoints };
    }
  } else {
    // If the item doesn't exist in the current database (e.g. removed item-42), set points to 0
    if (updated.pontos_calculados !== 0) {
      if (stats) stats.zerados += 1;
      updated = { ...updated, pontos_calculados: 0 };
    }
  }

  return updated;
}

function migrateLancamentos(list: Lancamento[]): { list: Lancamento[]; stats: MigrationStats } {
  const stats: MigrationStats = { repontuados: 0, zerados: 0, idsDuplicados: 0 };
  // Sessões antigas podem conter IDs duplicados (gerados só com Date.now()).
  // A primeira ocorrência mantém o ID original — referências externas
  // (sugestões da triagem, operações de auditoria) passam a apontar para ela.
  const seenIds = new Set<string>();
  const migrated = list.map((l) => {
    let updated = migrateLancamento(l, stats);
    if (seenIds.has(updated.id)) {
      stats.idsDuplicados += 1;
      updated = { ...updated, id: gerarLancamentoId() };
    }
    seenIds.add(updated.id);
    return updated;
  });
  return { list: migrated, stats };
}

// Transparência para quem lançou dados na versão anterior (minuta):
// avisa quando pontos foram recalculados ou zerados sob o Decreto nº 13.048/2026.
function notifyMigration(stats: MigrationStats) {
  if (stats.repontuados > 0) {
    toast.info(
      `${stats.repontuados} lançamento(s) tiveram a pontuação recalculada conforme o Decreto nº 13.048/2026.`,
      { id: 'migracao-repontuados', duration: 10000 },
    );
  }
  if (stats.zerados > 0) {
    toast.warning(
      `${stats.zerados} lançamento(s) referem-se a itens excluídos pelo Decreto nº 13.048/2026 e agora valem 0 pontos. Revise-os no catálogo de itens.`,
      { id: 'migracao-zerados', duration: 12000 },
    );
  }
  if (stats.idsDuplicados > 0) {
    toast.warning(
      `${stats.idsDuplicados} lançamento(s) tinham identificadores duplicados e receberam novos identificadores. Se houver uma auditoria IA pendente, gere o prompt novamente antes de continuar.`,
      { id: 'migracao-ids-duplicados', duration: 12000 },
    );
  }
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
  createSession: (perfil: Servidor) => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
  setPerfil: (data: Servidor) => void;
  updateProcesso: (updates: Partial<ProcessoRSC>) => void;
  restoreSession: (session: RestoredSession) => void;
  importSessionAsNew: (session: RestoredSession) => void;
  addLancamento: (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => Lancamento;
  updateLancamento: (lancamentoId: string, updates: Partial<Omit<Lancamento, 'id'>>) => boolean;
  removeLancamento: (lancamentoId: string) => boolean;
  addComprovanteToLancamento: (lancamentoId: string, documentoId: string) => void;
  removeComprovanteFromLancamento: (lancamentoId: string, documentoId: string) => Promise<void>;
  addDocumento: (doc: Omit<Documento, 'id' | 'data_upload'>) => Documento;
  addDocumentoFromFile: (params: {
    servidorId: string;
    file: File;
    sourceName?: string;
    sourceMimeType?: string;
    convertedToPdf?: boolean;
    transcription?: string;
    componentHashes?: string[];
    componentFiles?: Documento['arquivos_componentes'];
    tipoDocumento?: Documento['tipo_documento'];
    categoriaInstrucao?: Documento['categoria_instrucao'];
  }) => Promise<{ doc: Documento; exists: boolean; conflitoClassificacao?: boolean }>;
  addDocumentoFromGedocLinks: (params: {
    servidorId: string;
    links: string[];
  }) => Promise<Documento>;
  updateDocumento: (docId: string, updates: Partial<Documento>) => void;
  deleteDocumento: (docId: string) => Promise<void>;
  triagem: EstadoTriagem | null;
  setTriagem: React.Dispatch<React.SetStateAction<EstadoTriagem | null>>;
  atualizarSugestao: (id: string, updates: Partial<SugestaoTriagem>) => void;
  limparTriagem: () => void;
  auditoria: EstadoAuditoria | null;
  setAuditoria: React.Dispatch<React.SetStateAction<EstadoAuditoria | null>>;
  atualizarOperacaoAuditoria: (id: string, updates: Partial<OperacaoAuditoria>) => void;
  limparAuditoria: () => void;
  importarOperacoesAuditoria: (origem: OrigemAuditoria, novasOps: OperacaoParseada[], erros: string[]) => void;
  importarOperacoesAvulsas: (novasOps: OperacaoParseada[], erros: string[]) => void;
  aplicarOperacoesAuditoria: () => { aplicadas: number; puladas: number };
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
    return id ? sanitizeServidor(loadJson<Servidor | null>(`rsc-tae-${id}-perfil`, null)) : null;
  });

  const [documentos, setDocumentos] = useState<Documento[]>(() => {
    const id = window.localStorage.getItem(GLOBAL_KEYS.active);
    return id ? loadJson<Documento[]>(`rsc-tae-${id}-documentos`, []) : [];
  });

  // Espelho síncrono de `documentos`: a deduplicação por hash precisa enxergar
  // arquivos adicionados na mesma rajada de uploads, antes de o estado do React
  // ser recalculado — sem isso, o mesmo arquivo selecionado duas vezes no mesmo
  // lote seria persistido em duplicidade.
  const documentosRef = useRef(documentos);
  useEffect(() => {
    documentosRef.current = documentos;
  }, [documentos]);

  const initialMigrationStats = useRef<MigrationStats | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(() => {
    const id = window.localStorage.getItem(GLOBAL_KEYS.active);
    const raw = id ? loadJson<Lancamento[]>(`rsc-tae-${id}-lancamentos`, []) : [];
    const { list, stats } = migrateLancamentos(raw);
    initialMigrationStats.current = stats;
    return list;
  });

  useEffect(() => {
    const stats = initialMigrationStats.current;
    if (stats) {
      initialMigrationStats.current = null;
      notifyMigration(stats);
    }
  }, []);

  const [processo, setProcesso] = useState<ProcessoRSC>(() => {
    const id = window.localStorage.getItem(GLOBAL_KEYS.active);
    return id ? loadJson<ProcessoRSC>(`rsc-tae-${id}-processo`, INITIAL_PROCESSO) : INITIAL_PROCESSO;
  });

  const [itensRSC] = useState<ItemRSC[]>(mockItensRSC);

  const [triagem, setTriagem] = useState<EstadoTriagem | null>(() => {
    const id = window.localStorage.getItem(GLOBAL_KEYS.active);
    return id ? loadJson<EstadoTriagem | null>(`rsc-tae-${id}-triagem`, null) : null;
  });

  const [auditoria, setAuditoria] = useState<EstadoAuditoria | null>(() => {
    const id = window.localStorage.getItem(GLOBAL_KEYS.active);
    return id ? loadAuditoria(`rsc-tae-${id}-auditoria`) : null;
  });

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
    const key = `rsc-tae-${activeSessionId}-triagem`;
    if (triagem) {
      window.localStorage.setItem(key, JSON.stringify(triagem));
    } else {
      window.localStorage.removeItem(key);
    }
  }, [triagem, activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) return;
    const key = `rsc-tae-${activeSessionId}-auditoria`;
    if (auditoria) {
      window.localStorage.setItem(key, JSON.stringify(auditoria));
    } else {
      window.localStorage.removeItem(key);
    }
  }, [auditoria, activeSessionId]);

  // ── Session actions ─────────────────────────────────────────────────────────

  const createSession = (perfil: Servidor) => {
    const perfilSanitizado = sanitizeServidor(perfil)!;
    const id = perfilSanitizado.id;
    const now = new Date().toISOString();
    const summary: SessionSummary = {
      id,
      siape: perfilSanitizado.siape,
      nome_completo: perfilSanitizado.nome_completo,
      created_at: now,
      updated_at: now,
    };

    // Persist immediately so effects are consistent on first render
    const keys = sessionKeys(id);
    window.localStorage.setItem(keys.perfil, JSON.stringify(perfilSanitizado));
    window.localStorage.setItem(keys.documentos, JSON.stringify([]));
    window.localStorage.setItem(keys.lancamentos, JSON.stringify([]));
    window.localStorage.setItem(keys.processo, JSON.stringify(INITIAL_PROCESSO));
    window.localStorage.setItem(GLOBAL_KEYS.active, id);

    setSessions((prev) => [...prev, summary]);
    setActiveSessionId(id);
    setServidor(perfilSanitizado);
    setDocumentos([]);
    setLancamentos([]);
    setProcesso(INITIAL_PROCESSO);
    setTriagem(null);
    setAuditoria(null);
  };

  const loadSession = (id: string) => {
    const keys = sessionKeys(id);
    window.localStorage.setItem(GLOBAL_KEYS.active, id);
    setActiveSessionId(id);
    setServidor(sanitizeServidor(loadJson<Servidor | null>(keys.perfil, null)));
    setDocumentos(loadJson<Documento[]>(keys.documentos, []));
    const { list: migratedLancamentos, stats } = migrateLancamentos(loadJson<Lancamento[]>(keys.lancamentos, []));
    notifyMigration(stats);
    setLancamentos(migratedLancamentos);
    setProcesso(loadJson<ProcessoRSC>(keys.processo, INITIAL_PROCESSO));
    setTriagem(loadJson<EstadoTriagem | null>(keys.triagem, null));
    setAuditoria(loadAuditoria(keys.auditoria));
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
      setTriagem(null);
      setAuditoria(null);
    }

    // Clean up IndexedDB blobs for this session
    if (sessionPerfil) {
      await deleteDocumentsByServidorId(sessionPerfil.id);
    }
  };

  const setPerfil = (data: Servidor) => {
    setServidor(sanitizeServidor(data));
  };

  const updateProcesso = useCallback((updates: Partial<ProcessoRSC>) => {
    setProcesso((current) => ({ ...current, ...updates }));
  }, []);

  const restoreSession = (session: RestoredSession) => {
    if (!activeSessionId) return;
    setServidor(sanitizeServidor(session.perfil));
    setDocumentos(session.documentos);
    const { list: migratedLancamentos, stats } = migrateLancamentos(session.lancamentos);
    notifyMigration(stats);
    setLancamentos(migratedLancamentos);
    setProcesso(session.processo ?? INITIAL_PROCESSO);
    setTriagem(session.triagem ?? null);
    setAuditoria(normalizeAuditoria(session.auditoria ?? null));
  };

  const importSessionAsNew = (restored: RestoredSession) => {
    if (!restored.perfil) return;
    const perfilSanitizado = sanitizeServidor(restored.perfil)!;
    const id = perfilSanitizado.id;
    const now = new Date().toISOString();
    const summary: SessionSummary = {
      id,
      siape: perfilSanitizado.siape,
      nome_completo: perfilSanitizado.nome_completo,
      created_at: now,
      updated_at: now,
    };

    const keys = sessionKeys(id);
    window.localStorage.setItem(keys.perfil, JSON.stringify(perfilSanitizado));
    window.localStorage.setItem(keys.documentos, JSON.stringify(restored.documentos));
    window.localStorage.setItem(keys.lancamentos, JSON.stringify(restored.lancamentos));
    window.localStorage.setItem(keys.processo, JSON.stringify(restored.processo ?? INITIAL_PROCESSO));
    if (restored.triagem) {
      window.localStorage.setItem(keys.triagem, JSON.stringify(restored.triagem));
    }
    if (restored.auditoria) {
      window.localStorage.setItem(keys.auditoria, JSON.stringify(restored.auditoria));
    }
    window.localStorage.setItem(GLOBAL_KEYS.active, id);

    setSessions((prev) => {
      if (prev.some((s) => s.id === id)) {
        return prev.map((s) => (s.id === id ? summary : s));
      }
      return [...prev, summary];
    });

    setActiveSessionId(id);
    setServidor(perfilSanitizado);
    setDocumentos(restored.documentos);
    const { list: migratedLancamentos, stats } = migrateLancamentos(restored.lancamentos);
    notifyMigration(stats);
    setLancamentos(migratedLancamentos);
    setProcesso(restored.processo ?? INITIAL_PROCESSO);
    setTriagem(restored.triagem ?? null);
    setAuditoria(normalizeAuditoria(restored.auditoria ?? null));
  };

  // ── Document & lançamento actions ────────────────────────────────────────────

  // Registra o documento no estado e no espelho síncrono na mesma passada,
  // para que uploads subsequentes do mesmo lote já o encontrem na deduplicação.
  const registrarDocumento = (newDoc: Documento) => {
    documentosRef.current = [...documentosRef.current, newDoc];
    setDocumentos((current) => [...current, newDoc]);
  };

  const addDocumento = (doc: Omit<Documento, 'id' | 'data_upload'>) => {
    const newDoc: Documento = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      data_upload: new Date().toISOString(),
    };
    registrarDocumento(newDoc);
    return newDoc;
  };

  const addDocumentoFromFile = async ({
    servidorId,
    file,
    sourceName,
    sourceMimeType,
    convertedToPdf,
    transcription,
    componentHashes,
    componentFiles,
    tipoDocumento,
    categoriaInstrucao,
  }: {
    servidorId: string;
    file: File;
    sourceName?: string;
    sourceMimeType?: string;
    convertedToPdf?: boolean;
    transcription?: string;
    componentHashes?: string[];
    componentFiles?: Documento['arquivos_componentes'];
    tipoDocumento?: Documento['tipo_documento'];
    categoriaInstrucao?: Documento['categoria_instrucao'];
  }) => {
    const fileHash = await computeDocumentHash(file);
    const normalizedName = normalizeFileName(file.name);
    const incomingHashes = Array.from(new Set([fileHash, ...(componentHashes ?? [])].filter(Boolean)));
    // A merge of N source files — component hashes must NOT be used across different merges
    // because two distinct merges can legitimately share source files.
    const isMultiFileMerge = (componentHashes?.length ?? 0) > 1;

    const duplicatedDocument = documentosRef.current.find((doc) => {
      if (doc.servidor_id !== servidorId || !doc.caminho_storage) {
        return false;
      }

      const storedHashes = new Set([
        doc.hash_arquivo,
        ...(doc.hashes_componentes ?? []),
      ].filter(Boolean));

      if (isMultiFileMerge) {
        // Only the final merged file hash triggers a duplicate — comparing component
        // hashes would produce false positives when different merges share source files.
        if (storedHashes.has(fileHash)) return true;
      } else {
        if (incomingHashes.some((hash) => storedHashes.has(hash))) return true;
      }

      return (
        normalizeFileName(doc.nome_arquivo) === normalizedName &&
        doc.tamanho_bytes === file.size
      );
    });

    if (duplicatedDocument) {
      // Reclassificar um comprobatório vinculado a lançamento como documento de
      // instrução mudaria sua natureza no dossiê e afetaria os lançamentos que
      // dependem dele — nesse caso, reporta o conflito sem alterar nada.
      const mudaParaInstrucao =
        tipoDocumento === 'instrucao_processual' &&
        duplicatedDocument.tipo_documento !== 'instrucao_processual';
      const usadoEmLancamento = lancamentos.some((l) =>
        getLancamentoDocumentIds(l).includes(duplicatedDocument.id),
      );
      if (mudaParaInstrucao && usadoEmLancamento) {
        return { doc: duplicatedDocument, exists: true, conflitoClassificacao: true };
      }

      const classificationUpdates: Partial<Documento> = {
        ...(transcription && !duplicatedDocument.transcricao ? { transcricao: transcription } : {}),
        ...(tipoDocumento ? { tipo_documento: tipoDocumento } : {}),
        ...(categoriaInstrucao ? { categoria_instrucao: categoriaInstrucao } : {}),
      };
      if (Object.keys(classificationUpdates).length > 0) {
        updateDocumento(duplicatedDocument.id, classificationUpdates);
      }
      return { doc: { ...duplicatedDocument, ...classificationUpdates }, exists: true };
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const persistedFile = await persistDocumentFile({ docId, servidorId, file });

    const newDoc: Documento = {
      id: docId,
      servidor_id: servidorId,
      nome_arquivo: file.name,
      hash_arquivo: persistedFile.hash,
      hashes_componentes: incomingHashes,
      arquivos_componentes: componentFiles,
      caminho_storage: persistedFile.caminhoStorage,
      mime_type: persistedFile.mimeType,
      tamanho_bytes: persistedFile.tamanhoBytes,
      data_upload: new Date().toISOString(),
      convertido_para_pdf: convertedToPdf || undefined,
      arquivo_origem_nome: sourceName,
      arquivo_origem_mime: sourceMimeType,
      transcricao: transcription,
      tipo_documento: tipoDocumento,
      categoria_instrucao: categoriaInstrucao,
    };

    registrarDocumento(newDoc);
    return { doc: newDoc, exists: false };
  };

  const addDocumentoFromGedocLinks = async ({
    servidorId,
    links,
  }: {
    servidorId: string;
    links: string[];
  }): Promise<Documento> => {
    const normalizedLinks = links.map(normalizeInstitutionDocumentLink);

    // Mesmo conjunto de links = mesmo documento de referência: reaproveita o
    // registro existente em vez de criar uma cópia.
    const chaveLinks = [...normalizedLinks].sort().join('\n');
    const existente = documentosRef.current.find(
      (doc) =>
        doc.servidor_id === servidorId &&
        (doc.gedoc_links?.length ?? 0) > 0 &&
        [...(doc.gedoc_links ?? [])].sort().join('\n') === chaveLinks,
    );
    if (existente) return existente;

    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const nomeArquivo = buildInstitutionReferenceFileName(normalizedLinks.length);

    const newDoc: Documento = {
      id: docId,
      servidor_id: servidorId,
      nome_arquivo: nomeArquivo,
      data_upload: new Date().toISOString(),
      gedoc_links: normalizedLinks,
    };

    registrarDocumento(newDoc);
    return newDoc;
  };

  const addLancamento = (lancamento: Omit<Lancamento, 'id' | 'status_auditoria'>) => {
    const newLancamento: Lancamento = {
      ...lancamento,
      id: gerarLancamentoId(),
      status_auditoria: 'Pendente',
    };
    setLancamentos((current) => [...current, newLancamento]);
    return newLancamento;
  };

  const updateLancamento = (lancamentoId: string, updates: Partial<Omit<Lancamento, 'id'>>) => {
    if (!lancamentos.some((lancamento) => lancamento.id === lancamentoId)) return false;

    setLancamentos((current) =>
      current.map((lancamento) =>
        lancamento.id === lancamentoId
          ? { ...lancamento, ...updates, id: lancamento.id }
          : lancamento,
      ),
    );
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

  const addComprovanteToLancamento = (lancamentoId: string, documentoId: string) => {
    setLancamentos((current) =>
      current.map((l) =>
        l.id === lancamentoId
          ? { ...l, comprovantes_ids: [...new Set([...(l.comprovantes_ids ?? []), documentoId])] }
          : l,
      ),
    );
  };

  const removeComprovanteFromLancamento = async (lancamentoId: string, documentoId: string) => {
    setLancamentos((current) =>
      current.map((l) =>
        l.id === lancamentoId
          ? { ...l, comprovantes_ids: (l.comprovantes_ids ?? []).filter((id) => id !== documentoId) }
          : l,
      ),
    );
    const usadoEmOutros = lancamentos.some(
      (l) => l.id !== lancamentoId && (l.comprovantes_ids ?? []).includes(documentoId),
    );
    if (!usadoEmOutros) {
      await deleteDocumento(documentoId);
    }
  };

  const updateDocumento = (docId: string, updates: Partial<Documento>) => {
    setDocumentos((current) =>
      current.map((doc) => (doc.id === docId ? { ...doc, ...updates } : doc))
    );
  };

  const deleteDocumento = async (docId: string) => {
    setDocumentos((current) => current.filter((doc) => doc.id !== docId));
    await deleteDocumentFile(docId);
  };

  const atualizarSugestao = (id: string, updates: Partial<SugestaoTriagem>) => {
    setTriagem((current) => {
      if (!current) return current;
      return {
        ...current,
        sugestoes: current.sugestoes.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      };
    });
  };

  const limparTriagem = () => {
    setTriagem(null);
  };

  const atualizarOperacaoAuditoria = (id: string, updates: Partial<OperacaoAuditoria>) => {
    setAuditoria((current) => {
      if (!current) return current;
      return {
        ...current,
        operacoes: current.operacoes.map((op) => (op.id === id ? { ...op, ...updates } : op)),
      };
    });
  };

  const limparAuditoria = () => {
    setAuditoria(null);
  };

  // Importa as operações recém-extraídas de uma auditoria para o módulo,
  // substituindo apenas as da mesma origem (mantém histórico aplicado e a
  // outra origem). Ver mergeOperacoesPorOrigem.
  const importarOperacoesAuditoria = (
    origem: OrigemAuditoria,
    novasOps: OperacaoParseada[],
    erros: string[],
  ) => {
    setAuditoria((current) => mergeOperacoesPorOrigem(current, origem, novasOps, erros));
  };

  // Importa operações avulsas de validação de um lançamento específico,
  // substituindo apenas as pendentes daquele lançamento para não interferir em outros.
  const importarOperacoesAvulsas = (
    novasOps: OperacaoParseada[],
    erros: string[],
  ) => {
    setAuditoria((current) => {
      const anteriores = current?.operacoes ?? [];
      const lancIdsAtualizados = new Set(novasOps.map((op) => op.lancamento_id));
      
      const mantidas = anteriores.filter(
        (op) => !lancIdsAtualizados.has(op.lancamento_id) || op.status === 'aplicada'
      );
      
      const agora = new Date().toISOString();
      const novas: OperacaoAuditoria[] = novasOps.map((op) => ({
        ...op,
        status: 'pendente',
        origem: 'consolidar',
        criada_em: agora,
      }));
      
      return {
        schema_version: 1,
        operacoes: [...mantidas, ...novas],
        ultima_colagem_por_origem: {
          ...(current?.ultima_colagem_por_origem ?? {}),
          consolidar: {
            em: agora,
            erros: [...(current?.ultima_colagem_por_origem?.consolidar?.erros ?? []), ...erros],
          },
        },
      };
    });
  };

  // Aplica ao dossiê todas as operações aprovadas, na ordem segura, e as marca
  // como 'aplicada' (histórico). 'sinalizar' aprovado é apenas registrado e
  // vira 'rejeitada' (não há auto-fix). Lógica antes duplicada no modal/Triagem.
  const aplicarOperacoesAuditoria = (): { aplicadas: number; puladas: number } => {
    const aprovadas = (auditoria?.operacoes ?? []).filter((o) => o.status === 'aprovada');
    if (aprovadas.length === 0) return { aplicadas: 0, puladas: 0 };

    const agora = new Date().toISOString();
    const aplicadasIds = new Set<string>();
    let aplicadas = 0;
    let puladas = 0;
    const ordem: TipoOperacao[] = ['remover_lancamento', 'reclassificar', 'ajustar_periodos', 'ajustar_quantidade'];

    for (const tipo of ordem) {
      for (const op of aprovadas.filter((o) => o.tipo === tipo)) {
        const lanc = lancamentos.find((l) => l.id === op.lancamento_id);
        if (!lanc) { puladas++; continue; }

        // Desvincula do lançamento os comprovantes que a IA marcou como
        // irrelevantes (documentos_remover). Retorna undefined quando não há
        // nada a remover, para não alterar comprovantes_ids sem necessidade.
        const comprovantesAjustados = (() => {
          if (!op.documentos_remover?.length) return undefined;
          const remover = new Set(op.documentos_remover);
          const atuais = getLancamentoDocumentIds(lanc);
          const restantes = atuais.filter((id) => !remover.has(id));
          return restantes.length !== atuais.length ? restantes : undefined;
        })();

        if (tipo === 'remover_lancamento') {
          removeLancamento(op.lancamento_id);
          aplicadasIds.add(op.id);
          aplicadas++;
        } else if (tipo === 'reclassificar' && op.novo_item_rsc_id) {
          const novoItem = itensRSC.find((i) => i.id === op.novo_item_rsc_id);
          if (!novoItem) { puladas++; continue; }
          const periodos = op.novos_periodos ?? periodosDoLancamento(lanc);
          let quantidade = op.nova_quantidade ?? lanc.quantidade_informada;
          if (novoItem.modo_calculo !== 'manual') {
            const dias = totalDiasPeriodos(periodos);
            quantidade = novoItem.modo_calculo === 'auto_mes' ? unidadesMes(dias) : unidadesAnoFracao(dias);
          }
          const abr = abrangenciaPeriodos(periodos);
          const pontos = calculateLancamentoPoints(quantidade, novoItem.pontos_por_unidade);
          updateLancamento(op.lancamento_id, {
            item_rsc_id: op.novo_item_rsc_id,
            periodos,
            quantidade_informada: quantidade,
            pontos_calculados: pontos,
            data_inicio: abr?.inicio ?? lanc.data_inicio,
            data_fim: abr?.fim ?? lanc.data_fim,
            ...(comprovantesAjustados ? { comprovantes_ids: comprovantesAjustados } : {}),
          });
          aplicadasIds.add(op.id);
          aplicadas++;
        } else if (tipo === 'ajustar_periodos' && op.novos_periodos) {
          const item = itensRSC.find((i) => i.id === lanc.item_rsc_id);
          const periodos = op.novos_periodos;
          const dias = totalDiasPeriodos(periodos);
          let quantidade = lanc.quantidade_informada;
          if (item && item.modo_calculo !== 'manual') {
            quantidade = item.modo_calculo === 'auto_mes' ? unidadesMes(dias) : unidadesAnoFracao(dias);
          }
          const abr = abrangenciaPeriodos(periodos);
          const pontos = item ? calculateLancamentoPoints(quantidade, item.pontos_por_unidade) : lanc.pontos_calculados;
          updateLancamento(op.lancamento_id, {
            periodos,
            quantidade_informada: quantidade,
            pontos_calculados: pontos,
            data_inicio: abr?.inicio ?? lanc.data_inicio,
            data_fim: abr?.fim ?? lanc.data_fim,
            ...(comprovantesAjustados ? { comprovantes_ids: comprovantesAjustados } : {}),
          });
          aplicadasIds.add(op.id);
          aplicadas++;
        } else if (tipo === 'ajustar_quantidade' && op.nova_quantidade !== undefined) {
          const item = itensRSC.find((i) => i.id === lanc.item_rsc_id);
          const pontos = item ? calculateLancamentoPoints(op.nova_quantidade, item.pontos_por_unidade) : lanc.pontos_calculados;
          updateLancamento(op.lancamento_id, {
            quantidade_informada: op.nova_quantidade,
            pontos_calculados: pontos,
            ...(comprovantesAjustados ? { comprovantes_ids: comprovantesAjustados } : {}),
          });
          aplicadasIds.add(op.id);
          aplicadas++;
        }
      }
    }

    // Marca aplicadas (histórico) e resolve 'sinalizar' aprovado como rejeitado.
    setAuditoria((current) => {
      if (!current) return current;
      return {
        ...current,
        operacoes: current.operacoes.map((op) => {
          if (aplicadasIds.has(op.id)) return { ...op, status: 'aplicada' as const, aplicada_em: agora };
          if (op.tipo === 'sinalizar' && op.status === 'aprovada') return { ...op, status: 'rejeitada' as const };
          return op;
        }),
      };
    });

    return { aplicadas, puladas };
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
        createSession,
        loadSession,
        deleteSession,
        setPerfil,
        updateProcesso,
        restoreSession,
        importSessionAsNew,
        addLancamento,
        updateLancamento,
        removeLancamento,
        addComprovanteToLancamento,
        removeComprovanteFromLancamento,
        addDocumento,
        addDocumentoFromFile,
        addDocumentoFromGedocLinks,
        updateDocumento,
        deleteDocumento,
        triagem,
        setTriagem,
        atualizarSugestao,
        limparTriagem,
        auditoria,
        setAuditoria,
        atualizarOperacaoAuditoria,
        limparAuditoria,
        importarOperacoesAuditoria,
        importarOperacoesAvulsas,
        aplicarOperacoesAuditoria,
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
