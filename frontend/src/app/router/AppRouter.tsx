import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layout/MainLayout';
import { SwipePage } from '../../features/discovery/SwipePage';
import { CatalogPage } from '../../features/discovery/CatalogPage';
import { InventoryPage } from '../../features/inventory/InventoryPage';
import { TransactionsPage } from '../../features/transactions/TransactionsPage';
import { SocialPage } from '../../features/social/SocialPage';
import { AuthenticationPage } from '../../features/authentication/AuthenticationPage';
import { AdminSettingsPage } from '../../features/admin/AdminSettingsPage';
import { PlansPage } from '../../features/subscriptions/PlansPage';
import { useAuthStore } from '../../features/authentication/store/authStore';

// Componente para proteger las rutas
const ProtectedRoute: React.FC<{ children: React.ReactElement; requireAdmin?: boolean }> = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, user } = useAuthStore();
  const token = localStorage.getItem('token');

  // Si hay token pero no se ha cargado el usuario, mostramos una carga rápida
  if (token && !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="wizard-loading">Cargando perfil...</div>
      </div>
    );
  }

  // Si no está autenticado, redirigir al login (/auth)
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Si requiere admin pero el rol no coincide, redirigir al inicio (Descubrir)
  if (requireAdmin && user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<SwipePage />} />
          
          <Route path="catalogo" element={
            <ProtectedRoute>
              <CatalogPage />
            </ProtectedRoute>
          } />
          
          <Route path="libreta" element={
            <ProtectedRoute>
              <InventoryPage />
            </ProtectedRoute>
          } />
          
          <Route path="transacciones" element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          } />
          
          <Route path="planes" element={<PlansPage />} />
          
          <Route path="social" element={
            <ProtectedRoute>
              <SocialPage />
            </ProtectedRoute>
          } />
          
          <Route path="auth" element={<AuthenticationPage />} />
          
          <Route path="admin" element={
            <ProtectedRoute requireAdmin>
              <AdminSettingsPage />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
