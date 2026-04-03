import React, { useState } from 'react';
import InstituicaoCombobox from '../components/InstituicaoCombobox';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronRight,
  PlusCircle,
  Trash2,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
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
  const { sessions, createSession, loadSession, deleteSession } = useAppContext();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    siape: '',
    nome_completo: '',
    email_institucional: '',
    instituicao: '',
    lotacao: '',
    cargo: '',
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
    email_institucional: form.email_institucional.trim(),
    instituicao: form.instituicao.trim(),
    lotacao: form.lotacao.trim(),
    cargo: form.cargo.trim(),
    escolaridade_atual: form.escolaridade_atual,
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.siape.trim() ||
      !form.nome_completo.trim() ||
      !form.email_institucional.trim() ||
      !form.instituicao.trim() ||
      !form.lotacao.trim() ||
      !form.cargo.trim() ||
      !form.escolaridade_atual
    ) {
      toast.error('Preencha todos os campos obrigatórios.');
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-4">
            <AppLogo className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">{institutionConfig.appName}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{institutionConfig.appSubtitle}</p>
        </div>

        {showForm ? (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
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
              <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-1.5">
                <Label htmlFor="email_institucional">
                  E-mail Institucional <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email_institucional"
                  type="email"
                  placeholder={institutionConfig.emailPlaceholder}
                  value={form.email_institucional}
                  onChange={set('email_institucional')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="instituicao">
                    Instituição <span className="text-red-500">*</span>
                  </Label>
                  <InstituicaoCombobox
                    value={form.instituicao}
                    onChange={(v) => setForm((prev) => ({ ...prev, instituicao: v }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cargo">
                    Cargo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cargo"
                    placeholder="Ex.: Assistente em Administração"
                    value={form.cargo}
                    onChange={set('cargo')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lotacao">
                  Unidade de Lotação <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lotacao"
                  placeholder="Ex.: Campus Vitória, Reitoria, Pró-Reitoria de Ensino..."
                  value={form.lotacao}
                  onChange={set('lotacao')}
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
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-5 py-4 text-left transition-all hover:border-primary/60 hover:bg-primary/10"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Nova Sessão</p>
                <p className="text-xs text-gray-500">Iniciar um novo processo RSC</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-primary/60" />
          </button>
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
                <li key={session.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{session.nome_completo}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      <span>SIAPE {session.siape}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(session.updated_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={deletingId === session.id}
                      onClick={() => handleDeleteSession(session.id)}
                      className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                      title="Remover sessão"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContinue(session.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      Continuar
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
  );
}
