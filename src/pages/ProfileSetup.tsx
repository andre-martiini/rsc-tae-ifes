import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';
import { Servidor } from '../data/mock';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

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
  const { servidor, setPerfil } = useAppContext();
  const navigate = useNavigate();
  const isEditing = !!servidor;

  const [form, setForm] = useState({
    siape: servidor?.siape ?? '',
    nome_completo: servidor?.nome_completo ?? '',
    email_institucional: servidor?.email_institucional ?? '',
    lotacao: servidor?.lotacao ?? '',
    escolaridade_atual: servidor?.escolaridade_atual ?? '',
    cargo: servidor?.cargo ?? '',
    data_ingresso: servidor?.data_ingresso ?? '',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.siape.trim() || !form.nome_completo.trim() || !form.escolaridade_atual) {
      toast.error('Preencha ao menos SIAPE, nome completo e escolaridade.');
      return;
    }

    const perfil: Servidor = {
      id: servidor?.id ?? `srv-${Date.now()}`,
      siape: form.siape.trim(),
      nome_completo: form.nome_completo.trim(),
      email_institucional: form.email_institucional.trim(),
      lotacao: form.lotacao.trim(),
      escolaridade_atual: form.escolaridade_atual,
      cargo: form.cargo.trim() || undefined,
      data_ingresso: form.data_ingresso || undefined,
    };

    setPerfil(perfil);
    toast.success(isEditing ? 'Perfil atualizado com sucesso.' : 'Perfil criado. Bem-vindo ao RSC-TAE!');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-4 mb-4">
            <img src="/logo_ifes.png" alt="Logo IFES" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">RSC-TAE — IFES</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditing ? 'Atualize seus dados de identificação.' : 'Preencha seus dados para começar. Eles ficam salvos apenas neste navegador.'}
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <UserCircle className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-gray-900">
              {isEditing ? 'Editar Perfil' : 'Criar Perfil'}
            </h2>
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
                <Label htmlFor="data_ingresso">Data de Ingresso no Serviço</Label>
                <Input
                  id="data_ingresso"
                  type="date"
                  value={form.data_ingresso}
                  onChange={set('data_ingresso')}
                />
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
              <Label htmlFor="email_institucional">E-mail Institucional</Label>
              <Input
                id="email_institucional"
                type="email"
                placeholder="joao.silva@ifes.edu.br"
                value={form.email_institucional}
                onChange={set('email_institucional')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lotacao">Lotação</Label>
              <Input
                id="lotacao"
                placeholder="Ex.: Campus Barra de São Francisco"
                value={form.lotacao}
                onChange={set('lotacao')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                placeholder="Ex.: Assistente em Administração"
                value={form.cargo}
                onChange={set('cargo')}
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
                <option value="">Selecione a escolaridade...</option>
                {ESCOLARIDADES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex gap-3">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="border-gray-200 text-gray-700"
                >
                  Cancelar
                </Button>
              )}
              <Button type="submit" className="flex-1 bg-primary text-white hover:bg-primary/90">
                {isEditing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Salvar alterações
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Criar perfil e começar
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Seus dados são armazenados exclusivamente neste navegador. Nenhuma informação é enviada a servidores externos.
        </p>
      </div>
    </div>
  );
}
