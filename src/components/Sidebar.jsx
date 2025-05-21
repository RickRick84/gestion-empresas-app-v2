import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { rol } = useAuth();

  const linkClass = (path) =>
    `block px-4 py-2 rounded transition ${
      location.pathname === path
        ? 'bg-green-500 text-white font-bold'
        : 'text-gray-700 hover:bg-gray-200'
    }`;

  return (
    <aside className="w-full max-w-[240px] bg-white shadow-md h-full p-4">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">Menú</h2>
      <nav className="flex flex-col gap-2">
        <Link to="/dashboard" className={linkClass('/dashboard')}>
          Dashboard
        </Link>
        <Link to="/facturacion" className={linkClass('/facturacion')}>
          Facturación
        </Link>
        <Link to="/proveedores" className={linkClass('/proveedores')}>
          Cargar Proveedores
        </Link>

        {rol === 'admin' && (
          <>
            <Link to="/stock" className={linkClass('/stock')}>
              Control de Stock
            </Link>
            <Link to="/stock/ajuste" className={linkClass('/stock/ajuste')}>
              Ajuste Manual de Stock
            </Link>
            <Link to="/reportes" className={linkClass('/reportes')}>
              Reportes
            </Link>
            <Link to="/historial" className={linkClass('/historial')}>
              Historial de Actividades
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
