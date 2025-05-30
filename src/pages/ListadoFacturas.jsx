import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function ListadoFacturas() {
  const [registros, setRegistros] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');
  const [facturaModal, setFacturaModal] = useState(null);

  useEffect(() => {
    obtenerFacturas();
  }, []);

  useEffect(() => {
    let resultado = [...registros];

    if (busqueda.trim() !== '') {
      resultado = resultado.filter(f =>
        f.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
        f.concepto.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (fechaInicio) {
      const desde = new Date(fechaInicio);
      resultado = resultado.filter(f => f.fecha.toDate() >= desde);
    }

    if (fechaFin) {
      const hasta = new Date(fechaFin);
      resultado = resultado.filter(f => f.fecha.toDate() <= hasta);
    }

    if (montoMin) {
      resultado = resultado.filter(f => f.monto >= parseFloat(montoMin));
    }

    if (montoMax) {
      resultado = resultado.filter(f => f.monto <= parseFloat(montoMax));
    }

    setFiltrados(resultado);
  }, [busqueda, fechaInicio, fechaFin, montoMin, montoMax, registros]);

  const obtenerFacturas = async () => {
    try {
      const q = query(collection(db, 'facturas'), orderBy('fecha', 'desc'));
      const snap = await getDocs(q);
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistros(lista);
    } catch (error) {
      console.error('Error al obtener facturas:', error);
    }
  };

  const eliminarFactura = async (id) => {
    if (!window.confirm('¿Eliminar esta factura?')) return;
    try {
      await deleteDoc(doc(db, 'facturas', id));
      setRegistros(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('❌ Error al eliminar factura:', error);
    }
  };

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Facturas');

    sheet.columns = [
      { header: 'Cliente', key: 'cliente', width: 25 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Concepto', key: 'concepto', width: 25 },
      { header: 'Monto', key: 'monto', width: 15 }
    ];

    filtrados.forEach((item) => {
      sheet.addRow({
        cliente: item.cliente,
        fecha: item.fecha?.toDate().toLocaleDateString() || '',
        concepto: item.concepto,
        monto: item.monto
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'facturas.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const descargarPDF = (factura) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Factura', 14, 20);
    doc.setFontSize(12);
    doc.autoTable({
      startY: 30,
      head: [['Campo', 'Valor']],
      body: [
        ['Cliente', factura.cliente],
        ['Fecha', factura.fecha?.toDate().toLocaleDateString()],
        ['Concepto', factura.concepto],
        ['Monto', `$${factura.monto.toFixed(2)}`],
        ['Detalle', factura.detalle || 'Sin detalles']
      ]
    });
    doc.save(`Factura_${factura.cliente}.pdf`);
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Listado de Facturas</h1>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <input
            type="text"
            placeholder="Cliente o concepto..."
            className="px-3 py-2 border rounded"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <input
            type="date"
            className="px-3 py-2 border rounded"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
          <input
            type="date"
            className="px-3 py-2 border rounded"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
          <input
            type="number"
            placeholder="Monto mínimo"
            className="px-3 py-2 border rounded"
            value={montoMin}
            onChange={(e) => setMontoMin(e.target.value)}
          />
          <input
            type="number"
            placeholder="Monto máximo"
            className="px-3 py-2 border rounded"
            value={montoMax}
            onChange={(e) => setMontoMax(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <button
            onClick={exportarExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded"
          >
            Exportar a Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-white shadow rounded text-sm">
            <thead>
              <tr className="bg-gray-200 text-left text-gray-700">
                <th className="p-3">Cliente</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Concepto</th>
                <th className="p-3">Monto</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{item.cliente}</td>
                  <td className="p-3">{item.fecha?.toDate().toLocaleDateString()}</td>
                  <td className="p-3">{item.concepto}</td>
                  <td className="p-3">${item.monto.toFixed(2)}</td>
                  <td className="p-3 text-center space-x-2">
                    <button
                      onClick={() => setFacturaModal(item)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => eliminarFactura(item.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {facturaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Factura</h2>
              <p><strong>Cliente:</strong> {facturaModal.cliente}</p>
              <p><strong>Fecha:</strong> {facturaModal.fecha?.toDate().toLocaleDateString()}</p>
              <p><strong>Concepto:</strong> {facturaModal.concepto}</p>
              <p><strong>Monto:</strong> ${facturaModal.monto.toFixed(2)}</p>
              <p><strong>Detalle:</strong> {facturaModal.detalle || 'Sin detalle'}</p>
              <div className="flex justify-end mt-4 gap-2">
                <button
                  onClick={() => descargarPDF(facturaModal)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                >
                  Descargar PDF
                </button>
                <button
                  onClick={() => setFacturaModal(null)}
                  className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ListadoFacturas;
