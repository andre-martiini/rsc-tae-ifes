import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronRight,
  CircleHelp,
  Loader2,
  PlusCircle,
  Trash2,
  Upload,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import AppFooter from '../components/AppFooter';
import AppLogo from '../components/AppLogo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { institutionConfig } from '../config/institution';
import { useAppContext } from '../context/AppContext';
import type { SessionSummary } from '../context/AppContext';
import type { Servidor } from '../data/mock';

const ESCOLARIDADES = [
  'Ensino Fundamental Incompleto',
  'Ensino Fundamental',
  'Ensino Médio',
  'Graduação',
  'Especialização',
  'Mestrado',
  'Doutorado',
];

interface ConflictState {
  existingSession: SessionSummary;
  pendingPerfil: Servidor;
}

export default function LandingScreen() {
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const { sessions, createSession, loadSession, deleteSession, importSessionAsNew } = useAppContext();

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

  const [form, setForm] = useState({
    siape: '',
    nome_completo: '',
    escolaridade_atual: '',
  });

  const set =
    (field: keyof typeof form) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const buildPerfil = (): Servidor => ({
    id: `srv-${Date.now()}`,
    siape: form.siape.trim(),
    nome_completo: form.nome_completo.trim(),
    email_institucional: '',
    instituicao: '',
    lotacao: '',
    cargo: '',
    escolaridade_atual: form.escolaridade_atual,
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

  const handleDeleteSession = async (id: string) => {
    setDeletingId(id);
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-4">
            <AppLogo className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">{institutionConfig.appName}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{institutionConfig.appSubtitle}</p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowAbout((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              <CircleHelp className="h-3.5 w-3.5" />
              O que é o Assistente RSC-TAE?
            </button>
          </div>
          {showAbout && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Sobre o assistente</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                O Assistente RSC-TAE é uma ferramenta de apoio para organizar evidências,
                registrar lançamentos por item, calcular pontuações e montar o dossiê
                do processo de RSC-TAE com mais clareza e segurança.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Ele não substitui a análise institucional, mas ajuda você a reunir
                informações e documentos de forma estruturada ao longo da preparação
                do processo.
              </p>
            </div>
          )}
        </div>

        {showForm ? (
          // ... form remains here
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
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
            <p className="mb-6 text-sm text-gray-500">
              Preencha seus dados de identificação para criar a sessão. Eles ficam salvos apenas neste navegador.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="siape">
                    SIAPE <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="siape"
                    placeholder="1234567"
                    value={form.siape}
                    onChange={set('siape')}
                    maxLength={7}
                  />
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nome_completo">
                  Nome Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome_completo"
                  placeholder="Ex.: Joao da Silva"
                  value={form.nome_completo}
                  onChange={set('nome_completo')}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar sessão e começar
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-5 py-6 text-left transition-all hover:border-primary/60 hover:bg-primary/10"
            >
              <div className="space-y-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Nova Sessão</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Começar do zero</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-primary/60" />
            </button>

            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-6 text-left transition-all hover:border-primary/40 hover:bg-gray-50 disabled:opacity-50"
            >
              <div className="space-y-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                  {isImporting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Restaurar Sessão</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Carregar backup .zip</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </button>
            <input
              type="file"
              ref={importInputRef}
              onChange={(e) => e.target.files?.[0] && handleImportSession(e.target.files[0])}
              accept=".zip"
              className="hidden"
            />
          </div>
        )}

        {sessions.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Sessões salvas</p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">
                {sessions.length}
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <li key={session.id} className="relative flex items-center gap-3 px-4 py-4 pr-16 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3.5 sm:pr-5">
                  <button
                    type="button"
                    disabled={deletingId === session.id}
                    onClick={() => handleDeleteSession(session.id)}
                    className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40 sm:hidden"
                    title="Remover sessÃ£o"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 sm:pr-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{session.nome_completo}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      <span>SIAPE {session.siape}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(session.updated_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-2 self-center sm:w-auto">
                    <button
                      type="button"
                      disabled={deletingId === session.id}
                      onClick={() => handleDeleteSession(session.id)}
                      className="hidden rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40 sm:inline-flex"
                      title="Remover sessão"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContinue(session.id)}
                      className="hidden items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 sm:flex"
                    >
                      Continuar
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContinue(session.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary/90 sm:hidden"
                      title={`Continuar sessÃ£o de ${session.nome_completo}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Todos os dados são armazenados exclusivamente neste navegador. Nenhuma informação é enviada a servidores externos.
        </p>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
