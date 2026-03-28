/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import AdminPortal from './pages/AdminPortal';
import CreatePassword from './pages/CreatePassword';
import Dashboard from './pages/Dashboard';
import ItemCatalog from './pages/ItemCatalog';
import Workspace from './pages/Workspace';
import Consolidation from './pages/Consolidation';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/create-password" element={<CreatePassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/itens" element={<ItemCatalog />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/consolidar" element={<Consolidation />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" richColors />
      </BrowserRouter>
    </AppProvider>
  );
}
