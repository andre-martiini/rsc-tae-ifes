/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useAppContext } from './context/AppContext';
import { Toaster } from 'sonner';
import LandingScreen from './pages/LandingScreen';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import ItemCatalog from './pages/ItemCatalog';
import Consolidation from './pages/Consolidation';
import Legislation from './pages/Legislation';

// Protects routes that require an active session
function RequireSession({ children }: { children: React.ReactNode }) {
  const { activeSessionId } = useAppContext();
  if (!activeSessionId) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route
            path="/perfil"
            element={
              <RequireSession>
                <ProfileSetup />
              </RequireSession>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireSession>
                <Dashboard />
              </RequireSession>
            }
          />
          <Route
            path="/itens"
            element={
              <RequireSession>
                <ItemCatalog />
              </RequireSession>
            }
          />

          <Route
            path="/consolidar"
            element={
              <RequireSession>
                <Consolidation />
              </RequireSession>
            }
          />
          <Route
            path="/legislacao"
            element={
              <RequireSession>
                <Legislation />
              </RequireSession>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" richColors />
      </BrowserRouter>
    </AppProvider>
  );
}
