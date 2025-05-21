import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Facturacion from './pages/Facturacion';
import ListadoFacturas from './pages/ListadoFacturas';
import Proveedores from './pages/Proveedores';
import ListadoProveedores from './pages/ListadoProveedores';
import Stock from './pages/Stock';
import AjusteStock from './pages/AjusteStock';
import Reportes from './pages/Reportes';
import Historial from './pages/Historial';

import BotButton from './components/BotButton';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, rol, loading } = useAuth();
  if (loading) return null;
  return user && rol === 'admin' ? children : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/facturacion" element={
          <ProtectedRoute>
            <Facturacion />
          </ProtectedRoute>
        } />

        <Route path="/facturas" element={
          <ProtectedRoute>
            <ListadoFacturas />
          </ProtectedRoute>
        } />

        <Route path="/proveedores" element={
          <ProtectedRoute>
            <Proveedores />
          </ProtectedRoute>
        } />

        <Route path="/proveedores/listado" element={
          <ProtectedRoute>
            <ListadoProveedores />
          </ProtectedRoute>
        } />

        <Route path="/stock" element={
          <AdminRoute>
            <Stock />
          </AdminRoute>
        } />

        <Route path="/stock/ajuste" element={
          <AdminRoute>
            <AjusteStock />
          </AdminRoute>
        } />

        <Route path="/reportes" element={
          <AdminRoute>
            <Reportes />
          </AdminRoute>
        } />

        <Route path="/historial" element={
          <AdminRoute>
            <Historial />
          </AdminRoute>
        } />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BotButton />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
