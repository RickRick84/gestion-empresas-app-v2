import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const { user, rol, loading } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [stock, setStock] = useState([]);

  useEffect(() => {
    if (!user || !rol) return;

    const unsubFacturas = onSnapshot(collection(db, 'facturas'), snap => {
      setFacturas(snap.docs.map(doc => doc.data()));
    });

    const unsubProveedores = onSnapshot(collection(db, 'facturasProveedores'), snap => {
      setProveedores(snap.docs.map(doc => doc.data()));
    });

    const unsubStock = onSnapshot(collection(db, 'stock'), snap => {
      setStock(snap.docs.map(doc => doc.data()));
    });

    return () => {
      unsubFacturas();
      unsubProveedores();
      unsubStock();
    };
  }, [user, rol]);

  const totalVentas = facturas.reduce((sum, f) => sum + (f.monto || 0), 0);
  const totalCompras = proveedores.reduce((sum, f) => sum + (f.monto || 0), 0);
  const stockTotal = stock.reduce((sum, p) => sum + (p.cantidad || 0), 0);
  const balance = totalVentas - totalCompras;

  const hoy = new Date();
  const en30Dias = new Date();
  en30Dias.setDate(hoy.getDate() + 30);

  const stockProximoAVencer = stock.filter(p => {
    if (!p.fechaVencimiento?.toDate) return false;
    const venc = p.fechaVencimiento.toDate();
    return venc >= hoy && venc <= en30Dias;
  });

  const vencimientosProveedores = proveedores.filter(p => {
    const v1 = p.primerVencimiento?.toDate?.() || null;
    const v2 = p.segundoVencimiento?.toDate?.() || null;
    return (
      (v1 && v1 >= hoy && v1 <= en30Dias) ||
      (v2 && v2 >= hoy && v2 <= en30Dias)
    );
  });

  if (loading) return <div className="p-8 text-gray-600">Cargando sesión...</div>;
  if (!user) return <div className="p-8 text-red-500">No autenticado.</div>;
  if (rol !== 'admin') return <div className="p-8 text-yellow-600">Acceso denegado. Rol insuficiente: {rol}</div>;

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Panel Principal</h1>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-white shadow rounded p-6 text-center">
            <h2 className="text-sm text-gray-500">Facturado Total</h2>
            <p className="text-2xl font-bold text-green-600 mt-2">${totalVentas.toFixed(2)}</p>
          </div>
          <div className="bg-white shadow rounded p-6 text-center">
            <h2 className="text-sm text-gray-500">Gastos en Proveedores</h2>
            <p className="text-2xl font-bold text-red-600 mt-2">${totalCompras.toFixed(2)}</p>
          </div>
          <div className="bg-white shadow rounded p-6 text-center">
            <h2 className="text-sm text-gray-500">Unidades en Stock</h2>
            <p className="text-2xl font-bold text-blue-600 mt-2">{stockTotal}</p>
          </div>
          <div className="bg-white shadow rounded p-6 text-center">
            <h2 className="text-sm text-gray-500">Balance General</h2>
            <p className={`text-2xl font-bold mt-2 ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border-l-4 border-yellow-500 p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-2 text-yellow-700">Productos próximos a vencer</h2>
            {stockProximoAVencer.length === 0 ? (
              <p className="text-gray-600 text-sm">No hay productos que venzan dentro de 30 días.</p>
            ) : (
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {stockProximoAVencer.map((p, i) => (
                  <li key={i}>
                    <strong>{p.nombre}</strong> vence el {p.fechaVencimiento.toDate().toLocaleDateString()}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border-l-4 border-rose-600 p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-2 text-rose-700">Vencimientos de pago próximos</h2>
            {vencimientosProveedores.length === 0 ? (
              <p className="text-gray-600 text-sm">No hay vencimientos próximos en facturas de proveedores.</p>
            ) : (
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {vencimientosProveedores.map((f, i) => {
                  const v1 = f.primerVencimiento?.toDate?.();
                  const v2 = f.segundoVencimiento?.toDate?.();
                  return (
                    <li key={i}>
                      <strong>{f.proveedor}</strong> - V1: {v1?.toLocaleDateString() || 'N/A'} | V2: {v2?.toLocaleDateString() || 'N/A'}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-4">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-1">Facturación</h2>
            <p className="text-gray-600 text-sm">Crear y gestionar facturas.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-1">Cargar Proveedores</h2>
            <p className="text-gray-600 text-sm">Registrar compras externas.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-1">Control de Stock</h2>
            <p className="text-gray-600 text-sm">Ver y ajustar inventario.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-1">Reportes</h2>
            <p className="text-gray-600 text-sm">Análisis visual y detallado.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
