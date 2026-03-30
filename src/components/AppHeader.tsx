import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from './ui/button';

interface AppHeaderProps {
  activeView: 'dashboard' | 'catalog' | 'workspace' | 'consolidate' | 'profile';
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateCatalog: () => void;
  onNavigateWorkspace: () => void;
  onNavigateConsolidate: () => void;
  onNavigateProfile: () => void;
  primaryAction?: React.ReactNode;
  secondaryContent?: React.ReactNode;
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'profile', label: 'Perfil' },
  { key: 'catalog', label: 'Itens' },
  { key: 'workspace', label: 'Lançar documentos' },
  { key: 'consolidate', label: 'Consolidar' },
] as const;

export default function AppHeader({
  activeView,
  onNavigateHome,
  onNavigateDashboard,
  onNavigateCatalog,
  onNavigateWorkspace,
  onNavigateConsolidate,
  onNavigateProfile,
  primaryAction,
  secondaryContent,
}: AppHeaderProps) {
  const handlers: Record<typeof NAV_ITEMS[number]['key'], () => void> = {
    dashboard: onNavigateDashboard,
    catalog: onNavigateCatalog,
    workspace: onNavigateWorkspace,
    consolidate: onNavigateConsolidate,
    profile: onNavigateProfile,
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              title="Trocar sessão"
              className="group flex shrink-0 items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-100"
            >
              <img src="/logo_ifes.png" alt="Logo IFES" className="h-10 w-10 object-contain" />
              <LogOut className="h-3.5 w-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-gray-900">RSC-TAE Ifes</h1>
              <p className="truncate text-sm text-gray-500">Reconhecimento de Saberes e Competências</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center gap-2">
            {NAV_ITEMS.map(({ key, label }) => (
              <Button
                key={key}
                onClick={handlers[key]}
                variant={activeView === key ? 'default' : 'outline'}
                className={
                  activeView === key
                    ? 'h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90'
                    : 'h-9 rounded-lg border-gray-200 px-4 text-sm font-semibold text-gray-700'
                }
              >
                {label}
              </Button>
            ))}
            {primaryAction}
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
