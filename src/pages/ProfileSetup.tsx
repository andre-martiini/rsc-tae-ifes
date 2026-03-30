import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { UserCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';
import { Servidor, CAMPI_IFES } from '../data/mock';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import AppHeader from '../components/AppHeader';

const ESCOLARIDADES = [
  'Ensino Fundamental Incompleto',
  'Ensino Fundamental',
  'Ensino Médio',
  'Graduação',
  'Especialização',
  'Mestrado',
  'Doutorado',
];

export default function ProfileSetup() {
  const { servidor, activeSessionId, setPerfil } = useAppContext();
  const navigate = useNavigate();

  // If there's no active session, send back to landing
  if (!activeSessionId) {
    return <Navigate to="/" replace />;
  }

  const [form, setForm] = useState({
    siape: servidor?.siape ?? '',
    nome_completo: servidor?.nome_completo ?? '',
    email_institucional: servidor?.email_institucional ?? '',
    lotacao: servidor?.lotacao ?? '',
    escolaridade_atual: servidor?.escolaridade_atual ?? '',
    cargo: servidor?.cargo ?? '',
  });

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.siape.trim() ||
      !form.nome_completo.trim() ||
      !form.email_institucional.trim() ||
      !form.lotacao.trim() ||
      !form.cargo.trim() ||
      !form.escolaridade_atual
    ) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    const perfil: Servidor = {
      id: servidor?.id ?? activeSessionId,
      siape: form.siape.trim(),
      nome_completo: form.nome_completo.trim(),
      email_institucional: form.email_institucional.trim(),
      lotacao: form.lotacao.trim(),
      escolaridade_atual: form.escolaridade_atual,
      cargo: form.cargo.trim(),
    };

    setPerfil(perfil);
    toast.success('Perfil atualizado com sucesso.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        activeView="profile"
        onNavigateHome={() => navigate('/')}
        onNavigateDashboard={() => navigate('/dashboard')}
        onNavigateCatalog={() => navigate('/itens')}
        onNavigateWorkspace={() => navigate('/workspace')}
        onNavigateConsolidate={() => navigate('/consolidar')}
        onNavigateProfile={() => undefined}
      />

      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <UserCircle className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-gray-900">Editar Perfil</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  {ESCOLARIDADES.map((e) => (
                    <option key={e} value={e}>
                      {e}
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
                placeholder="Ex.: João da Silva Sauro"
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
                placeholder="joao.silva@ifes.edu.br"
                value={form.email_institucional}
                onChange={set('email_institucional')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lotacao">
                  Lotação <span className="text-red-500">*</span>
                </Label>
                <select
                  id="lotacao"
                  value={form.lotacao}
                  onChange={set('lotacao')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecione...</option>
                  {CAMPI_IFES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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

            <div className="pt-2 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-gray-200 text-gray-700"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-primary text-white hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" />
                Salvar alterações
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Seus dados são armazenados exclusivamente neste navegador. Nenhuma informação é enviada a servidores externos.
        </p>
      </main>
    </div>
  );
}
