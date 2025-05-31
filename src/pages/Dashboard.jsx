import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, startOfWeek, addWeeks, isSameWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const { user, rol, loading } = useAuth();
  const navigate = useNavigate();

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

  const generarDatosSemanas = () => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    const semanas = [];

    for (let i = 5; i >= 0; i--) {
      const inicioSemana = addWeeks(base, -i);
      const etiqueta = format(inicioSemana, 'dd/MM');
      const ingreso = facturas
        .filter(f => f.fecha?.toDate && isSameWeek(f.fecha.toDate(), inicioSemana, { weekStartsOn: 1 }))
        .reduce((sum, f) => sum + (f.monto || 0), 0);
      const egreso = proveedores
        .filter(f => f.fechaCarga?.toDate && isSameWeek(f.fechaCarga.toDate(), inicioSemana, { weekStartsOn: 1 }))
        .reduce((sum, f) => sum + (f.monto || 0), 0);
      semanas.push({ semana: etiqueta, Ingresos: ingreso, Gastos: egreso });
    }

    return semanas;
  };

  const datosGrafico = generarDatosSemanas();

  if (loading) return <div className="p-8 text-gray-600">Cargando sesión...</div>;
  if (!user) return <div className="p-8 text-red-500">No autenticado.</div>;
  if (rol !== 'admin') return <div className="p-8 text-yellow-600">Acceso denegado. Rol insuficiente: {rol}</div>;

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8">
        <h1 className="text-3xl font-bold text-gray-800">Panel Principal</h1>

        {/* 🔢 KPIs */}
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

        {/* 📉 Gráfico */}
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Ingresos vs Gastos – últimas 6 semanas</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semana" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Ingresos" fill="#22c55e" />
              <Bar dataKey="Gastos" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 🚨 Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border-l-4 border-yellow-500 p-6 rounded shadow">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-yellow-700">Productos próximos a vencer</h2>
              <button
                onClick={() => navigate('/stock')}
                className="text-sm text-blue-600 hover:underline"
              >
                Ver más
              </button>
            </div>
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
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-rose-700">Vencimientos de pago próximos</h2>
              <button
                onClick={() => navigate('/proveedores/listado')}
                className="text-sm text-blue-600 hover:underline"
              >
                Ver más
              </button>
            </div>
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
      </main>
    </div>
  );
}

export default Dashboard;
