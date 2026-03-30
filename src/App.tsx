/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useAppContext } from './context/AppContext';
import { Toaster } from 'sonner';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import ItemCatalog from './pages/ItemCatalog';
import Workspace from './pages/Workspace';
import Consolidation from './pages/Consolidation';

// Rota raiz: redireciona para /dashboard se já tem perfil, senão para /perfil
function HomeRedirect() {
  const { servidor } = useAppContext();
  return <Navigate to={servidor ? '/dashboard' : '/perfil'} replace />;
}

// Protege rotas que exigem perfil cadastrado
function RequirePerfil({ children }: { children: React.ReactNode }) {
  const { servidor } = useAppContext();
  if (!servidor) return <Navigate to="/perfil" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/perfil" element={<ProfileSetup />} />
          <Route
            path="/dashboard"
            element={
              <RequirePerfil>
                <Dashboard />
              </RequirePerfil>
            }
          />
          <Route
            path="/itens"
            element={
              <RequirePerfil>
                <ItemCatalog />
              </RequirePerfil>
            }
          />
          <Route
            path="/workspace"
            element={
              <RequirePerfil>
                <Workspace />
              </RequirePerfil>
            }
          />
          <Route
            path="/consolidar"
            element={
              <RequirePerfil>
                <Consolidation />
              </RequirePerfil>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" richColors />
      </BrowserRouter>
    </AppProvider>
  );
}
