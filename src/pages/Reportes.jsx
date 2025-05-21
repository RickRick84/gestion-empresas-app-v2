import React, { useEffect, useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

function Reportes() {
  const [facturasEmpresa, setFacturasEmpresa] = useState([]);
  const [facturasProveedores, setFacturasProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const graficoRef = useRef(null);

  useEffect(() => {
    obtenerDatos();
  }, []);

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

  const totalVentas = facturasEmpresa.reduce((sum, f) => sum + (f.monto || 0), 0);
  const totalCompras = facturasProveedores.reduce((sum, f) => sum + (f.monto || 0), 0);
  const balance = totalVentas - totalCompras;

  const generarResumenMensual = () => {
    const resumen = {};

    [...facturasEmpresa, ...facturasProveedores].forEach((f) => {
      if (!f.fecha || !f.monto) return;
      const fecha = f.fecha.toDate ? f.fecha.toDate() : new Date(f.fecha);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

      if (!resumen[key]) {
        resumen[key] = { mes: key, Ventas: 0, Compras: 0 };
      }

      if (facturasEmpresa.includes(f)) resumen[key].Ventas += f.monto;
      if (facturasProveedores.includes(f)) resumen[key].Compras += f.monto;
    });

    return Object.values(resumen).sort((a, b) => a.mes.localeCompare(b.mes));
  };

  const resumenMensual = generarResumenMensual();

  const exportarPDF = () => {
    if (!graficoRef.current) return;

    toPng(graficoRef.current)
      .then((dataUrl) => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const ancho = 180;
        const alto = 100;

        pdf.setFontSize(16);
        pdf.text('Reporte General de Facturación', 15, 20);

        pdf.setFontSize(12);
        pdf.text(`Total Facturado: $${totalVentas.toFixed(2)}`, 15, 35);
        pdf.text(`Total Proveedores: $${totalCompras.toFixed(2)}`, 15, 43);
        pdf.text(`Balance General: $${balance.toFixed(2)}`, 15, 51);

        pdf.text('Gráfico Resumen Mensual:', 15, 65);
        pdf.addImage(dataUrl, 'PNG', 15, 70, ancho, alto);

        pdf.save('reporte_facturacion.pdf');
      })
      .catch((err) => {
        console.error('Error al exportar PDF:', err);
      });
  };

  const exportarExcel = () => {
    const data = resumenMensual.map(row => ({
      Mes: row.mes,
      Ventas: row.Ventas,
      Compras: row.Compras
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen');

    XLSX.writeFile(workbook, 'reporte_facturacion.xlsx');
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Reportes Generales</h1>

        {loading ? (
          <p className="text-gray-600">Cargando datos...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-10">
              <div className="bg-white shadow-md p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Facturado</h2>
                <p className="text-2xl text-green-600 font-bold">${totalVentas.toFixed(2)}</p>
              </div>
              <div className="bg-white shadow-md p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Proveedores</h2>
                <p className="text-2xl text-red-600 font-bold">${totalCompras.toFixed(2)}</p>
              </div>
              <div className="bg-white shadow-md p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Balance General</h2>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ${balance.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-white shadow-md p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Resumen Mensual</h2>
                <div className="flex gap-2">
                  <button
                    onClick={exportarPDF}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold"
                  >
                    Descargar PDF
                  </button>
                  <button
                    onClick={exportarExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-semibold"
                  >
                    Exportar Excel
                  </button>
                </div>
              </div>

              <div ref={graficoRef}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={resumenMensual}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Ventas" fill="#16a34a" />
                    <Bar dataKey="Compras" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Reportes;
