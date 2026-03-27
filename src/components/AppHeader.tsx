import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from './ui/button';

interface AppHeaderProps {
  activeView: 'dashboard' | 'catalog' | 'workspace' | 'consolidate';
  onNavigateDashboard: () => void;
  onNavigateCatalog: () => void;
  onNavigateWorkspace: () => void;
  onNavigateConsolidate: () => void;
  onLogout: () => void;
  primaryAction?: React.ReactNode;
  secondaryContent?: React.ReactNode;
}

export default function AppHeader({
  activeView,
  onNavigateDashboard,
  onNavigateCatalog,
  onNavigateWorkspace,
  onNavigateConsolidate,
  onLogout,
  primaryAction,
  secondaryContent,
}: AppHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-700">
              <span className="font-bold text-white">IFES</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-gray-900">RSC-TAE</h1>
              <p className="truncate text-sm text-gray-500">Reconhecimento de Saberes e Competencias</p>
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
              Lancar documentos
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

          <div className="flex shrink-0 items-center justify-end">
            <Button variant="ghost" onClick={onLogout} className="text-gray-500 hover:text-gray-900">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
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
