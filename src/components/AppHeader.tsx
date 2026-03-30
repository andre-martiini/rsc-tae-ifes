import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';

interface AppHeaderProps {
  activeView: 'dashboard' | 'catalog' | 'workspace' | 'consolidate';
  onNavigateDashboard: () => void;
  onNavigateCatalog: () => void;
  onNavigateWorkspace: () => void;
  onNavigateConsolidate: () => void;
  primaryAction?: React.ReactNode;
  secondaryContent?: React.ReactNode;
}

function getShortName(nomeCompleto: string): string {
  const parts = nomeCompleto.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function AppHeader({
  activeView,
  onNavigateDashboard,
  onNavigateCatalog,
  onNavigateWorkspace,
  onNavigateConsolidate,
  primaryAction,
  secondaryContent,
}: AppHeaderProps) {
  const { servidor } = useAppContext();
  const navigate = useNavigate();
  const shortName = servidor ? getShortName(servidor.nome_completo) : null;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <img src="/logo_ifes.png" alt="Logo IFES" className="h-10 w-10 object-contain" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-gray-900">RSC-TAE</h1>
              <p className="truncate text-sm text-gray-500">Reconhecimento de Saberes e Competências</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center gap-2">
            <Button
              onClick={onNavigateDashboard}
              variant={activeView === 'dashboard' ? 'default' : 'outline'}
              className={
                activeView === 'dashboard'
                  ? 'h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90'
                  : 'h-9 rounded-lg border-gray-200 px-4 text-sm font-semibold text-gray-700'
              }
            >
              Dashboard
            </Button>
            <Button
              onClick={onNavigateCatalog}
              variant={activeView === 'catalog' ? 'default' : 'outline'}
              className={
                activeView === 'catalog'
                  ? 'h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90'
                  : 'h-9 rounded-lg border-gray-200 px-4 text-sm font-semibold text-gray-700'
              }
            >
              Itens
            </Button>
            <Button
              onClick={onNavigateWorkspace}
              variant={activeView === 'workspace' ? 'default' : 'outline'}
              className={
                activeView === 'workspace'
                  ? 'h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90'
                  : 'h-9 rounded-lg border-gray-200 px-4 text-sm font-semibold text-gray-700'
              }
            >
              Lançar documentos
            </Button>
            <Button
              onClick={onNavigateConsolidate}
              variant={activeView === 'consolidate' ? 'default' : 'outline'}
              className={
                activeView === 'consolidate'
                  ? 'h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90'
                  : 'h-9 rounded-lg border-gray-200 px-4 text-sm font-semibold text-gray-700'
              }
            >
              Consolidar
            </Button>
            {primaryAction}
          </div>

          <div className="flex shrink-0 items-center gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate('/perfil')}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              title="Editar perfil"
            >
              <UserCircle className="h-4 w-4 shrink-0 text-gray-400" />
              {shortName ?? 'Editar perfil'}
            </button>
          </div>
        </div>
      </div>

      {secondaryContent && (
        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-1.5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2">
            {secondaryContent}
          </div>
        </div>
      )}
    </header>
  );
}
