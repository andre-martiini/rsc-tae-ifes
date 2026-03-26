import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, CheckCircle2, Lock, LogOut } from 'lucide-react';

export default function Dashboard() {
  const { servidor, logout } = useAppContext();
  const navigate = useNavigate();

  if (!servidor) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-green-700 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">IFES</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">RSC-TAE</h1>
            <p className="text-sm text-gray-500">Reconhecimento de Saberes e Competências</p>
          </div>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="text-gray-500 hover:text-gray-900">
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Exibição Passiva (Cabeçalho) */}
        <Card className="bg-white shadow-sm border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{servidor.nome_completo}</h2>
                <p className="text-gray-500">Lotação: {servidor.lotacao}</p>
                <p className="text-gray-500">SIAPE: {servidor.siape}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-3 border border-gray-200">
                  <Lock className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Nível de Escolaridade Detectado</p>
                    <p className="text-sm font-medium text-gray-900">{servidor.escolaridade_atual} - Fonte: SIGRH</p>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-3 border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-amber-800 font-medium">Trava de Segurança Ativa</p>
                    <p className="text-xs text-amber-700">Itens utilizados para o Incentivo à Qualificação (IQ) atual estão bloqueados para evitar dupla contagem.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <Button variant="link" className="text-sm text-green-700 p-0 h-auto">
                Atualização de Cadastro (Novo Título)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Área Central (Cards de Resumo) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-700">RSC-I</CardTitle>
              <CardDescription>Progresso para o nível I</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold text-gray-900">100%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Requisitos atingidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-700">RSC-II</CardTitle>
              <CardDescription>Progresso para o nível II</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold text-gray-900">45%</span>
                <span className="text-sm text-gray-500 mb-1">/ 100 pts</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Faltam 55 pontos</p>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-700">RSC-III</CardTitle>
              <CardDescription>Progresso para o nível III</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold text-gray-900">0%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-gray-300 h-2.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Requer RSC-II concluído</p>
            </CardContent>
          </Card>
        </div>

        {/* Ação Principal */}
        <div className="flex justify-center pt-8">
          <Button 
            size="lg" 
            className="bg-green-700 hover:bg-green-800 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            onClick={() => navigate('/workspace')}
          >
            Iniciar/Continuar Lançamento de Documentos
          </Button>
        </div>
      </main>
    </div>
  );
}
