import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layout/MainLayout';
import { SwipePage } from '../../features/discovery/SwipePage';
import { InventoryPage } from '../../features/inventory/InventoryPage';
import { TransactionsPage } from '../../features/transactions/TransactionsPage';
import { SocialPage } from '../../features/social/SocialPage';
import { AuthenticationPage } from '../../features/authentication/AuthenticationPage';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<SwipePage />} />
          <Route path="libreta" element={<InventoryPage />} />
          <Route path="transacciones" element={<TransactionsPage />} />
          <Route path="social" element={<SocialPage />} />
          <Route path="auth" element={<AuthenticationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
