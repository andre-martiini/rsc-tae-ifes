import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Save, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '../components/MainLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { institutionConfig } from '../config/institution';
import { useAppContext } from '../context/AppContext';
import type { Servidor } from '../data/mock';
import InstituicaoCombobox from '../components/InstituicaoCombobox';

const ESCOLARIDADES = [
  'Ensino Fundamental Incompleto',
  'Ensino Fundamental',
  'Ensino Médio',
  'Graduação',
  'Especialização',
  'Mestrado',
  'Doutorado',
];

const NIVEIS_CLASSIFICACAO = ['A', 'B', 'C', 'D', 'E'] as const;

export default function ProfileSetup() {
  const { servidor, activeSessionId, setPerfil } = useAppContext();
  const navigate = useNavigate();

  if (!activeSessionId) {
    return <Navigate to="/" replace />;
  }

  const [form, setForm] = useState({
    siape: servidor?.siape ?? '',
    nome_completo: servidor?.nome_completo ?? '',
    email_institucional: servidor?.email_institucional ?? '',
    instituicao: servidor?.instituicao ?? '',
    lotacao: servidor?.lotacao ?? '',
    escolaridade_atual: servidor?.escolaridade_atual ?? '',
    cargo: servidor?.cargo ?? '',
    nivel_classificacao: servidor?.nivel_classificacao ?? '',
    data_ingresso_ife: servidor?.data_ingresso_ife ?? servidor?.data_ingresso ?? '',
    funcao_encargo: servidor?.funcao_encargo ?? '',
    telefone: servidor?.telefone ?? '',
  });

  const set =
    (field: keyof typeof form) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.siape.trim() ||
      !form.nome_completo.trim() ||
      !form.email_institucional.trim() ||
      !form.instituicao.trim() ||
      !form.lotacao.trim() ||
      !form.cargo.trim() ||
      !form.nivel_classificacao ||
      !form.data_ingresso_ife ||
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
      instituicao: form.instituicao.trim(),
      lotacao: form.lotacao.trim(),
      escolaridade_atual: form.escolaridade_atual,
      cargo: form.cargo.trim(),
      nivel_classificacao: form.nivel_classificacao as Servidor['nivel_classificacao'],
      data_ingresso_ife: form.data_ingresso_ife,
      funcao_encargo: form.funcao_encargo.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
    };

    setPerfil(perfil);
    toast.success('Perfil atualizado com sucesso.');
    navigate('/dashboard');
  };

  return (
    <MainLayout activeView="profile">
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <UserCircle className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-gray-900">Editar Perfil</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nivel_classificacao">
                  Nível de Classificação <span className="text-red-500">*</span>
                </Label>
                <select
                  id="nivel_classificacao"
                  value={form.nivel_classificacao}
                  onChange={set('nivel_classificacao')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecione...</option>
                  {NIVEIS_CLASSIFICACAO.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="data_ingresso_ife">
                  Data de ingresso na IFE <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="data_ingresso_ife"
                  type="date"
                  value={form.data_ingresso_ife}
                  onChange={set('data_ingresso_ife')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="funcao_encargo">Função/Encargo</Label>
                <Input
                  id="funcao_encargo"
                  placeholder="Ex.: Coordenador(a), FG, CD ou equivalente"
                  value={form.funcao_encargo}
                  onChange={set('funcao_encargo')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="Ex.: (27) 99999-9999"
                  value={form.telefone}
                  onChange={set('telefone')}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-gray-200 text-gray-700 sm:w-auto"
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
    </MainLayout>
  );
}
