// Reportes.jsx versión refinada con dashboard profesional
import React, { useEffect, useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';

function Reportes() {
  const [facturasEmpresa, setFacturasEmpresa] = useState([]);
  const [facturasProveedores, setFacturasProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mensual');
  const graficoRef = useRef(null);

  useEffect(() => { obtenerDatos(); }, []);

  const obtenerDatos = async () => {
    try {
      const [snapEmpresa, snapProveedores] = await Promise.all([
        getDocs(collection(db, 'facturas')),
        getDocs(collection(db, 'facturasProveedores'))
      ]);
      setFacturasEmpresa(snapEmpresa.docs.map(doc => doc.data()));
      setFacturasProveedores(snapProveedores.docs.map(doc => doc.data()));
    } catch (error) {
      console.error('❌ Error al obtener datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const obtenerClave = (fecha, tipo) => {
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const week = Math.ceil(d.getDate() / 7);
    switch (tipo) {
      case 'semanal': return `${year}-W${week}`;
      case 'mensual': return `${year}-${month}`;
      case 'semestral': return `${year}-S${d.getMonth() < 6 ? 1 : 2}`;
      case 'anual': return `${year}`;
      default: return `${year}-${month}`;
    }
  };

  const resumen = {};
  const productoMap = {};
  const diaMap = {};
  const pagoMap = { 'MP': 0, 'Transferencia': 0 };

  facturasEmpresa.forEach(f => {
    if (!f.monto || !f.fecha) return;
    const clave = obtenerClave(f.fecha, periodo);
    if (!resumen[clave]) resumen[clave] = { periodo: clave, Ventas: 0, Compras: 0 };
    resumen[clave].Ventas += f.monto;

    const producto = f.concepto || 'Desconocido';
    productoMap[producto] = (productoMap[producto] || 0) + f.monto;

    const d = f.fecha.toDate();
    const dia = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    diaMap[dia] = (diaMap[dia] || 0) + f.monto;

    const medio = f.medioPago || 'MP';
    pagoMap[medio] = (pagoMap[medio] || 0) + f.monto;
  });

  facturasProveedores.forEach(f => {
    if (!f.monto || !f.fechaCarga) return;
    const clave = obtenerClave(f.fechaCarga, periodo);
    if (!resumen[clave]) resumen[clave] = { periodo: clave, Ventas: 0, Compras: 0 };
    resumen[clave].Compras += f.monto;
  });

  const resumenArr = Object.values(resumen).sort((a, b) => a.periodo.localeCompare(b.periodo));
  const productosArr = Object.entries(productoMap).map(([nombre, monto]) => ({ nombre, monto }));
  const diasArr = Object.entries(diaMap).map(([fecha, monto]) => ({ fecha, monto }));
  const mediosArr = Object.entries(pagoMap).map(([medio, monto]) => ({ medio, monto }));

  const totalVentas = resumenArr.reduce((acc, r) => acc + r.Ventas, 0);
  const totalCompras = resumenArr.reduce((acc, r) => acc + r.Compras, 0);
  const balance = totalVentas - totalCompras;
  const margen = totalVentas - totalCompras;
  const margenPct = totalVentas > 0 ? (margen / totalVentas) * 100 : 0;

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const resumenSheet = workbook.addWorksheet('Resumen');
    resumenSheet.columns = [
      { header: 'Periodo', key: 'periodo', width: 15 },
      { header: 'Ventas', key: 'Ventas', width: 15 },
      { header: 'Compras', key: 'Compras', width: 15 },
      { header: 'Balance', key: 'Balance', width: 15 }
    ];
    resumenArr.forEach(row => resumenSheet.addRow({ ...row, Balance: row.Ventas - row.Compras }));

    const prodSheet = workbook.addWorksheet('Ventas por Producto');
    prodSheet.columns = [
      { header: 'Producto', key: 'nombre', width: 30 },
      { header: 'Monto', key: 'monto', width: 15 }
    ];
    productosArr.forEach(row => prodSheet.addRow(row));

    const pagosSheet = workbook.addWorksheet('Medios de Pago');
    pagosSheet.columns = [
      { header: 'Medio', key: 'medio', width: 20 },
      { header: 'Monto', key: 'monto', width: 15 }
    ];
    mediosArr.forEach(row => pagosSheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'dashboard_reporte.xlsx';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard de Reportes</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-sm text-gray-500">Ventas Totales</h2>
            <p className="text-xl font-bold text-green-600">${totalVentas.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-sm text-gray-500">Compras Totales</h2>
            <p className="text-xl font-bold text-red-600">${totalCompras.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-sm text-gray-500">Margen $</h2>
            <p className="text-xl font-bold">${margen.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-sm text-gray-500">Margen %</h2>
            <p className="text-xl font-bold">{margenPct.toFixed(1)}%</p>
          </div>
        </div>

        <div className="flex justify-end">
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="border p-2 rounded">
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Resumen por {periodo}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resumenArr}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Ventas" fill="#10b981" />
                <Bar dataKey="Compras" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Ventas por Producto</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart layout="vertical" data={productosArr}>
                <XAxis type="number" />
                <YAxis dataKey="nombre" type="category" />
                <Tooltip />
                <Bar dataKey="monto" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Ventas Diarias</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={diasArr}>
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="monto" stroke="#6366f1" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Medios de Pago</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={mediosArr} dataKey="monto" nameKey="medio" cx="50%" cy="50%" outerRadius={100}>
                  {mediosArr.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="text-right">
          <button
            onClick={exportarExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded shadow"
          >Exportar Excel</button>
        </div>
      </main>
    </div>
  );
}

export default Reportes;
