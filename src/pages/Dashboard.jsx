import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import {
  collection,
  getDocs
} from 'firebase/firestore';

function Dashboard() {
  const [facturas, setFacturas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [stock, setStock] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const snapFacturas = await getDocs(collection(db, 'facturas'));
    const snapProveedores = await getDocs(collection(db, 'facturasProveedores'));
    const snapStock = await getDocs(collection(db, 'stock'));

    setFacturas(snapFacturas.docs.map(doc => doc.data()));
    setProveedores(snapProveedores.docs.map(doc => doc.data()));
    setStock(snapStock.docs.map(doc => doc.data()));
  };

  const totalVentas = facturas.reduce((sum, f) => sum + (f.monto || 0), 0);
  const totalCompras = proveedores.reduce((sum, f) => sum + (f.monto || 0), 0);
  const stockTotal = stock.reduce((sum, p) => sum + (p.cantidad || 0), 0);
  const balance = totalVentas - totalCompras;

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Panel Principal
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h2 className="text-sm font-semibold text-gray-500">Facturado Total</h2>
            <p className="text-2xl font-bold text-green-600 mt-2">${totalVentas.toFixed(2)}</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h2 className="text-sm font-semibold text-gray-500">Gastos en Proveedores</h2>
            <p className="text-2xl font-bold text-red-600 mt-2">${totalCompras.toFixed(2)}</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h2 className="text-sm font-semibold text-gray-500">Unidades en Stock</h2>
            <p className="text-2xl font-bold text-blue-600 mt-2">{stockTotal}</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h2 className="text-sm font-semibold text-gray-500">Balance General</h2>
            <p className={`text-2xl font-bold mt-2 ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">Facturación</h2>
            <p className="text-gray-600 text-sm">Crear y gestionar facturas.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">Cargar Proveedores</h2>
            <p className="text-gray-600 text-sm">Registrar facturas externas.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">Control de Stock</h2>
            <p className="text-gray-600 text-sm">Ver y ajustar inventario.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">Reportes</h2>
            <p className="text-gray-600 text-sm">Análisis semanal, mensual y anual.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
