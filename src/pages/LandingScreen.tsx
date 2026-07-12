import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calendar,
  ChevronRight,
  CircleHelp,
  History,
  Inbox,
  Loader2,
  Lock,
  Plus,
  PlusCircle,
  ShieldCheck,
  Trash2,
  Upload,
  UserCircle,
  X,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLogo from '../components/AppLogo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { institutionConfig } from '../config/institution';
import { useAppContext } from '../context/AppContext';
import type { SessionSummary } from '../context/AppContext';
import { ESCOLARIDADES, type Servidor } from '../data/mock';
import { SYSTEM_UPDATES } from '../data/updates';
import {
  clearDatabase,
  getServidoresCount,
  saveServidoresBatch,
  searchServidorByName,
  type ServidorBase,
} from '../lib/servidoresStorage';

interface ConflictState {
  existingSession: SessionSummary;
  pendingPerfil: Servidor;
}

export default function LandingScreen() {
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const { sessions, createSession, loadSession, deleteSession, importSessionAsNew } = useAppContext();

  const [selectedServidorBase, setSelectedServidorBase] = useState<ServidorBase | null>(null);
  const [suggestions, setSuggestions] = useState<ServidorBase[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  React.useEffect(() => {
    getServidoresCount().then(async (count) => {
      if (count === 0) {
        try {
          const response = await fetch('/cadastro_base.csv');
          if (response.ok) {
            const text = await response.text();
            const lines = text.split(/\r?\n/);
            if (lines.length > 0) {
              const headerLine = lines[0];
              let separator = ';';
              if (headerLine.includes('\t')) {
                separator = '\t';
              } else if (headerLine.includes(',')) {
                separator = ',';
              }
              const headers = headerLine.split(separator).map((h) => h.trim().replace(/^"|"$/g, ''));
              const parsedRecords: any[] = [];

              for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                let parts: string[] = [];
                if (line.includes('"')) {
                  const regex = new RegExp(`\\s*${separator}\\s*(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`, 'g');
                  parts = line.split(regex).map((p) => p.trim().replace(/^"|"$/g, ''));
                } else {
                  parts = line.split(separator).map((p) => p.trim());
                }

                if (parts.length >= headers.length) {
                  const obj: any = {};
                  headers.forEach((header, index) => {
                    obj[header] = parts[index] || '';
                  });
                  parsedRecords.push(obj);
                }
              }

              if (parsedRecords.length > 0) {
                await saveServidoresBatch(parsedRecords);
              }
            }
          }
        } catch (err) {
          console.error('Falha ao inicializar base de servidores:', err);
        }
      }
    });
  }, []);

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, nome_completo: val }));
    setSelectedServidorBase(null);

    if (val.trim().length >= 3) {
      try {
        const matches = await searchServidorByName(val, 8);
        setSuggestions(matches);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (item: ServidorBase) => {
    setForm((prev) => {
      const currentSiape = prev.siape.trim();
      const prefix = item.matricula.replace(/\D/g, '');
      return {
        ...prev,
        nome_completo: item.nome,
        siape: currentSiape === '' ? prefix : prev.siape,
      };
    });
    setSelectedServidorBase(item);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleImportSession = async (file: File) => {
    setIsImporting(true);
    try {
      const { importSession } = await import('../lib/sessionImport');
      const restored = await importSession(file);
      importSessionAsNew(restored);
      toast.success('Progresso restaurado com sucesso!');
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Arquivo inválido.';
      toast.error(`Erro ao restaurar: ${message}`);
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const [showForm, setShowForm] = useState(false);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SessionSummary | null>(null);

  const [form, setForm] = useState({
    siape: '',
    nome_completo: '',
    escolaridade_atual: '',
  });

  const set =
    (field: keyof typeof form) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const hasDoctorate = form.escolaridade_atual === 'Doutorado';

  const buildPerfil = (): Servidor => ({
    id: `srv-${Date.now()}`,
    siape: form.siape.trim(),
    nome_completo: form.nome_completo.trim(),
    email_institucional: '',
    instituicao: selectedServidorBase?.org_lotacao || '',
    lotacao: selectedServidorBase?.org_lotacao || '',
    cargo: selectedServidorBase?.descricao_cargo || '',
    nivel_classificacao: (selectedServidorBase?.classe_cargo as any) || undefined,
    escolaridade_atual: form.escolaridade_atual,
    situacao_funcional: selectedServidorBase?.situacao_vinculo?.toLowerCase().includes('ativo') ? 'Ativo' : 'Inativo',
    database_siape_prefix: selectedServidorBase?.matricula || undefined,
    database_cargo: selectedServidorBase?.descricao_cargo || undefined,
    database_classe: selectedServidorBase?.classe_cargo || undefined,
    database_situacao: selectedServidorBase?.situacao_vinculo || undefined,
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.siape.trim() ||
      !form.nome_completo.trim() ||
      !form.escolaridade_atual
    ) {
      toast.error('Preencha os campos obrigatórios (SIAPE, Nome e Escolaridade).');
      return;
    }

    const siape = form.siape.trim();
    const existing = sessions.find((session) => session.siape === siape);

    if (existing) {
      setConflict({ existingSession: existing, pendingPerfil: buildPerfil() });
      return;
    }

    createSession(buildPerfil());
    navigate('/dashboard');
  };

  const handleConfirmOverwrite = async () => {
    if (!conflict) return;

    await deleteSession(conflict.existingSession.id);
    createSession(conflict.pendingPerfil);
    setConflict(null);
    navigate('/dashboard');
  };

  const handleContinue = (id: string) => {
    loadSession(id);
    navigate('/dashboard');
  };

  const handleDeleteSession = (session: SessionSummary) => {
    setPendingDelete(session);
  };

  const confirmDeleteSession = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeletingId(id);
    setPendingDelete(null);
    try {
      await deleteSession(id);
      toast.success('Sessão removida.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (conflict) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Sessão já existente</h2>
          </div>
          <p className="text-sm leading-relaxed text-gray-600">
            Já existe uma sessão salva para o SIAPE{' '}
            <span className="font-semibold text-gray-900">{conflict.existingSession.siape}</span>{' '}
            ({conflict.existingSession.nome_completo}).
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Deseja substituí-la? Todos os dados anteriores serão apagados permanentemente.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700"
              onClick={() => setConflict(null)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmOverwrite}
            >
              Substituir sessão
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col text-on-background antialiased"
      style={{ background: 'linear-gradient(to top, rgba(0, 107, 31, 0.14) 0%, rgba(0, 107, 31, 0.05) 45%, rgb(255, 255, 255) 100%)' }}
    >
      {/* Animated waves at the base */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-[120px] md:h-[200px] overflow-hidden">
        <svg className="wave-layer wave-slow" viewBox="0 0 2880 320" preserveAspectRatio="none">
          <path
            fill="#006b1f"
            fillOpacity="0.06"
            d="M0,120 C240,180 480,60 720,120 C960,180 1200,60 1440,120 C1680,180 1920,60 2160,120 C2400,180 2640,60 2880,120 L2880,320 L0,320 Z"
          />
        </svg>
        <svg className="wave-layer wave-mid" viewBox="0 0 2880 320" preserveAspectRatio="none">
          <path
            fill="#006b1f"
            fillOpacity="0.08"
            d="M0,180 C240,230 480,130 720,180 C960,230 1200,130 1440,180 C1680,230 1920,130 2160,180 C2400,230 2640,130 2880,180 L2880,320 L0,320 Z"
          />
        </svg>
        <svg className="wave-layer wave-fast" viewBox="0 0 2880 320" preserveAspectRatio="none">
          <path
            fill="#006b1f"
            fillOpacity="0.1"
            d="M0,240 C240,280 480,200 720,240 C960,280 1200,200 1440,240 C1680,280 1920,200 2160,240 C2400,280 2640,200 2880,240 L2880,320 L0,320 Z"
          />
        </svg>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 relative z-10 w-full flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-8 items-center w-full">

            {/* Left Column: Hero & Actions */}
            <div className="xl:col-span-7 flex flex-col gap-5 md:gap-8">

              {/* Hero Section */}
              <section className="flex flex-col items-start">
                <div className="mb-4 md:mb-6 flex w-full items-center justify-between gap-3">
                  <AppLogo className="h-10 w-10 md:h-12 md:w-12 shrink-0 drop-shadow-sm" />
                  <button
                    type="button"
                    onClick={() => setShowAbout((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-outline-variant text-on-surface-variant shadow-sm hover:bg-surface-container hover:text-primary transition-colors cursor-pointer text-[11px] sm:text-xs font-semibold"
                  >
                    <CircleHelp className="h-3.5 w-3.5 shrink-0" />
                    O que é o Assistente RSC-TAE?
                  </button>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-on-surface mb-3 md:mb-6 font-bold tracking-tight font-headline">
                  Assistente <span className="text-primary">RSC-TAE</span>
                </h1>

                <p className="text-sm md:text-lg text-on-surface-variant max-w-xl leading-relaxed mb-5 md:mb-8">
                  {institutionConfig.appSubtitle}
                </p>

                <button
                  type="button"
                  onClick={() => setShowUpdatesModal(true)}
                  className="px-4 py-2 md:px-5 md:py-2.5 rounded-full border-2 border-primary/20 text-primary hover:bg-primary/5 transition-colors flex items-center gap-2 text-xs font-semibold"
                >
                  <Clock className="h-4 w-4 shrink-0" />
                  Ver Novidades do Sistema
                </button>
              </section>

              {showAbout && (
                <div className="rounded-3xl border border-outline-variant/40 bg-surface/80 p-6 shadow-md max-w-xl transition-all">
                  <p className="text-sm font-semibold text-gray-900">Sobre o assistente</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    O Assistente RSC-TAE é uma ferramenta de apoio para organizar evidências,
                    registrar lançamentos por item, calcular pontuações e montar o dossiê
                    documental do pedido de RSC-TAE com mais clareza e segurança.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    Ele não substitui a análise institucional, mas ajuda você a reunir
                    informações e documentos de forma estruturada ao longo da preparação
                    do pedido.
                  </p>
                </div>
              )}

              {/* Action Area (Form or Action Grid) */}
              {showForm ? (
                <div className="rounded-2xl sm:rounded-3xl border border-outline-variant/40 bg-white/95 p-4 sm:p-6 shadow-xl max-w-xl backdrop-blur-xl w-full">
                  <div className="mb-4 sm:mb-6 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <UserCircle className="h-5 w-5 text-primary" />
                    <h2 className="text-base font-bold text-gray-900">Criar Perfil</h2>
                  </div>
                  <p className="mb-4 sm:mb-6 text-xs text-gray-500">
                    Preencha seus dados de identificação para criar a sessão. Eles ficam salvos apenas neste navegador.
                  </p>

                  <form onSubmit={handleCreateSubmit} className="space-y-4 sm:space-y-5">
                    <div className="space-y-1.5 relative">
                      <Label htmlFor="nome_completo">
                        Nome Completo <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="nome_completo"
                        placeholder="Ex.: Joao da Silva"
                        value={form.nome_completo}
                        onChange={handleNameChange}
                        onFocus={() => form.nome_completo.trim().length >= 3 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                        autoComplete="off"
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg divide-y divide-gray-50">
                          {suggestions.map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => handleSelectSuggestion(item)}
                                className="flex w-full flex-col px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                              >
                                <span className="text-sm font-semibold text-gray-900">{item.nome}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-medium">
                                  {item.descricao_cargo} · {item.org_lotacao} · Prefixo: {item.matricula}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="siape">
                        SIAPE <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="siape"
                        placeholder="1234567"
                        value={form.siape}
                        onChange={set('siape')}
                        maxLength={9}
                      />
                      {selectedServidorBase && !form.siape.trim().startsWith(selectedServidorBase.matricula.replace(/\D/g, '')) && (
                        <p className="text-[11px] font-medium text-amber-600 mt-1 leading-normal">
                          ⚠️ O SIAPE não coincide com o prefixo da base pública (esperado: {selectedServidorBase.matricula.replace(/\D/g, '')}).
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="escolaridade_atual">
                        Escolaridade Atual <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="escolaridade_atual"
                        value={form.escolaridade_atual}
                        onChange={set('escolaridade_atual')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Selecione...</option>
                        {ESCOLARIDADES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    {hasDoctorate && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <p className="leading-relaxed">
                            Pela escolaridade informada, não há nível de RSC a pleitear, pois o RSC-VI corresponde à equivalência de doutorado. O sistema pode ser usado para consulta ou organização, sem geração de pedido de RSC.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Criar sessão e começar
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 max-w-xl w-full">
                  {/* Nova Sessão Card */}
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="group relative p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white/70 backdrop-blur-xl border border-outline-variant/40 hover:border-primary/40 shadow-sm flex flex-row items-center gap-4 sm:flex-col sm:items-stretch sm:justify-between sm:gap-0 sm:min-h-[190px] w-full"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10 flex flex-row items-center gap-4 sm:flex-col sm:items-stretch sm:h-full sm:justify-between flex-1 min-w-0">
                      <div className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 bg-surface rounded-xl sm:rounded-2xl shadow-sm border border-outline-variant/30 flex items-center justify-center text-primary sm:mb-10 group-hover:scale-110 group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                        <Plus className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-xl md:text-2xl font-bold text-on-surface sm:mb-1 group-hover:text-primary transition-colors font-headline">Nova Sessão</h3>
                        <p className="text-[10px] sm:text-[11px] md:text-xs text-on-surface-variant uppercase tracking-widest font-semibold">Começar do Zero</p>
                      </div>
                    </div>
                    <ChevronRight className="relative z-10 h-5 w-5 shrink-0 text-outline-variant group-hover:text-primary transition-colors sm:hidden" />
                    <div className="absolute right-6 bottom-6 hidden sm:block opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </button>

                  {/* Restaurar Sessão Card */}
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    disabled={isImporting}
                    className="group relative p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white/70 backdrop-blur-xl border border-outline-variant/40 hover:border-secondary/40 shadow-sm disabled:opacity-50 flex flex-row items-center gap-4 sm:flex-col sm:items-stretch sm:justify-between sm:gap-0 sm:min-h-[190px] w-full"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10 flex flex-row items-center gap-4 sm:flex-col sm:items-stretch sm:h-full sm:justify-between flex-1 min-w-0">
                      <div className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 bg-surface rounded-xl sm:rounded-2xl shadow-sm border border-outline-variant/30 flex items-center justify-center text-on-surface-variant sm:mb-10 group-hover:scale-110 group-hover:bg-secondary group-hover:text-on-secondary transition-all duration-300">
                        {isImporting ? (
                          <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6 sm:h-7 sm:w-7" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-xl md:text-2xl font-bold text-on-surface sm:mb-1 group-hover:text-secondary transition-colors font-headline">Restaurar Sessão</h3>
                        <p className="text-[10px] sm:text-[11px] md:text-xs text-on-surface-variant uppercase tracking-widest font-semibold">Carregar Backup .zip</p>
                      </div>
                    </div>
                    <ChevronRight className="relative z-10 h-5 w-5 shrink-0 text-outline-variant group-hover:text-secondary transition-colors sm:hidden" />
                    <div className="absolute right-6 bottom-6 hidden sm:block opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <ArrowUp className="h-5 w-5" />
                      </div>
                    </div>
                  </button>
                  <input
                    type="file"
                    ref={importInputRef}
                    onChange={(e) => e.target.files?.[0] && handleImportSession(e.target.files[0])}
                    accept=".zip"
                    className="hidden"
                  />
                </section>
              )}
            </div>

            {/* Right Column: Context & History */}
            <div className="xl:col-span-5 flex flex-col gap-6 xl:pt-8 w-full">
              
              {/* Version Alert */}
              <section className="w-full">
                <div className="bg-white/80 backdrop-blur-md border border-primary/20 rounded-2xl p-3.5 md:p-6 flex flex-row gap-3 md:gap-4 items-start shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-primary/10 rounded-full text-primary flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="h-4.5 w-4.5 md:h-5 md:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[11px] md:text-sm font-bold text-on-surface mb-0.5 md:mb-1 uppercase tracking-wider font-sans">Alinhado ao Novo Decreto</h3>
                    <p className="text-xs md:text-sm leading-relaxed text-on-surface-variant font-sans">
                      O sistema está atualizado conforme as diretrizes do Decreto nº 13.048/2026, atos complementares e normas internas.
                    </p>
                  </div>
                </div>
              </section>

              {/* Saved Sessions Panel */}
              <section className="flex-1 flex flex-col w-full">
                <div className="bg-white/80 backdrop-blur-xl border border-outline-variant/60 rounded-3xl overflow-hidden shadow-lg shadow-on-surface/5 flex flex-col h-full w-full">
                  
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-lowest/50">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      <h2 className="text-xs font-bold text-on-surface uppercase tracking-widest font-sans">Sessões Salvas</h2>
                    </div>
                    <span className="bg-primary text-on-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">{sessions.length}</span>
                  </div>

                  <div className="p-2 flex-1 overflow-y-auto max-h-[350px]">
                    {sessions.length === 0 ? (
                      <div className="p-6 sm:p-8 text-center text-gray-400">
                        <Inbox className="mx-auto mb-2 h-9 w-9 opacity-50" />
                        <p className="text-sm">Nenhuma sessão salva neste navegador.</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {sessions.map((session) => (
                          <div
                            key={session.id}
                            className="p-3 sm:p-4 md:p-5 rounded-2xl flex items-center gap-3 sm:gap-4 hover:bg-surface-container-low transition-all duration-200 group border border-transparent hover:border-outline-variant/30"
                          >
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-surface border border-outline-variant/50 text-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-sm group-hover:bg-primary group-hover:text-on-primary transition-colors">
                              <UserCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm md:text-base font-bold text-on-surface group-hover:text-primary transition-colors font-sans truncate">{session.nome_completo}</h4>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-on-surface-variant text-[11px] font-sans font-medium">
                                <span className="bg-surface-container px-1.5 py-0.5 rounded text-on-surface whitespace-nowrap">SIAPE {session.siape}</span>
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(session.updated_at)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={deletingId === session.id}
                                onClick={() => handleDeleteSession(session)}
                                className="text-outline-variant hover:text-error transition-colors p-2 rounded-full hover:bg-error-container/50 sm:text-outline sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 disabled:opacity-40"
                                title="Remover sessão"
                              >
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleContinue(session.id)}
                                title="Continuar sessão"
                                className="bg-surface border border-outline-variant text-on-surface p-2.5 sm:px-4 sm:py-2 rounded-full sm:rounded-xl text-xs md:text-sm font-semibold group-hover:bg-primary group-hover:text-on-primary group-hover:border-primary transition-all flex items-center gap-1 shadow-sm font-sans whitespace-nowrap"
                              >
                                <span className="hidden sm:inline">Continuar</span>
                                <ChevronRight className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-3 sm:px-4 py-2 bg-surface-container-lowest/80 border-t border-outline-variant/40">
                    <p className="text-center text-[10px] sm:text-[11px] text-outline font-medium flex items-center justify-center gap-1.5 font-sans">
                      <Lock className="h-3 w-3 shrink-0" />
                      Todos os dados são armazenados exclusivamente neste navegador. Nenhuma informação é enviada a servidores externos.
                    </p>
                  </div>
                </div>
              </section>
            </div>

        </div>
      </main>

      {/* Updates Modal */}
      {showUpdatesModal && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm pt-8 pb-12"
          onClick={(e) => e.target === e.currentTarget && setShowUpdatesModal(false)}
        >
          <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Histórico de Atualizações</h3>
                  <p className="text-xs text-gray-500">Confira o que mudou recentemente no sistema</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdatesModal(false)}
                className="rounded-xl bg-gray-50 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6 bg-gray-50/30">
              {SYSTEM_UPDATES.map((update, idx) => {
                return (
                  <div key={idx} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h4 className="text-sm font-bold text-gray-900">{update.title}</h4>
                      <span className="text-xs font-semibold text-gray-400">{update.date}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">{update.description}</p>
                    
                    <div className="space-y-3.5 border-t border-gray-50 pt-3.5">
                      {update.features && update.features.length > 0 && (
                        <div>
                          <div className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-700 mb-1.5">
                            <span>Novidades</span>
                          </div>
                          <ul className="space-y-1">
                            {update.features.map((pt, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-violet-500 mt-0.5" />
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {update.improvements && update.improvements.length > 0 && (
                        <div>
                          <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700 mb-1.5">
                            <span>Melhorias</span>
                          </div>
                          <ul className="space-y-1">
                            {update.improvements.map((pt, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-500 mt-0.5" />
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {update.fixes && update.fixes.length > 0 && (
                        <div>
                          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 mb-1.5">
                            <span>Correções</span>
                          </div>
                          <ul className="space-y-1">
                            {update.fixes.map((pt, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-5 bg-white flex justify-end">
              <Button
                onClick={() => setShowUpdatesModal(false)}
                className="bg-primary text-white hover:bg-primary/95 px-6 rounded-xl font-bold h-10"
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setPendingDelete(null)}
        >
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden">
            <div className="p-6 sm:p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Remover sessão</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Tem certeza que deseja remover a sessão de{' '}
                <span className="font-semibold text-gray-900">{pendingDelete.nome_completo}</span>{' '}
                (SIAPE {pendingDelete.siape})? Todos os dados desta sessão serão apagados permanentemente.
              </p>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-200 text-gray-700"
                  onClick={() => setPendingDelete(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  onClick={confirmDeleteSession}
                >
                  Remover
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
