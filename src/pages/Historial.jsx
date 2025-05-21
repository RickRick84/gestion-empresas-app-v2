import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx';

function Historial() {
  const [registros, setRegistros] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtrados, setFiltrados] = useState([]);

  useEffect(() => {
    obtenerHistorial();
  }, []);

  useEffect(() => {
    let resultado = [...registros];

    if (filtroModulo) {
      resultado = resultado.filter(r => r.modulo === filtroModulo);
    }

    if (filtroTipo) {
      resultado = resultado.filter(r => r.tipo === filtroTipo);
    }

    if (filtroTexto.trim() !== '') {
      resultado = resultado.filter(r =>
        r.descripcion.toLowerCase().includes(filtroTexto.toLowerCase())
      );
    }

    setFiltrados(resultado);
  }, [filtroModulo, filtroTipo, filtroTexto, registros]);

  const obtenerHistorial = async () => {
    try {
      const q = query(collection(db, 'historial'), orderBy('fecha', 'desc'));
      const snap = await getDocs(q);
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistros(lista);
    } catch (error) {
      console.error('Error al obtener historial:', error);
    }
  };

  const exportarExcel = () => {
    const data = filtrados.map(r => ({
      Fecha: r.fecha?.toDate().toLocaleString() || '',
      Módulo: r.modulo,
      Tipo: r.tipo,
      Usuario: r.usuario,
      Descripción: r.descripcion
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, 'auditoria_historial.xlsx');
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Historial de Actividades</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <select
            className="px-3 py-2 border rounded"
            value={filtroModulo}
            onChange={(e) => setFiltroModulo(e.target.value)}
          >
            <option value="">Todos los módulos</option>
            <option value="facturacion">Facturación</option>
            <option value="stock">Stock</option>
          </select>

          <select
            className="px-3 py-2 border rounded"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="alta">Alta</option>
            <option value="baja">Baja</option>
            <option value="ajuste">Ajuste</option>
          </select>

          <input
            type="text"
            className="px-3 py-2 border rounded"
            placeholder="Buscar descripción..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />

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
                <th className="p-3">Fecha</th>
                <th className="p-3">Módulo</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Usuario</th>
                <th className="p-3">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{r.fecha?.toDate().toLocaleString()}</td>
                  <td className="p-3 capitalize">{r.modulo}</td>
                  <td className="p-3 capitalize">{r.tipo}</td>
                  <td className="p-3">{r.usuario}</td>
                  <td className="p-3">{r.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default Historial;
