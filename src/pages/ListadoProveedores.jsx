import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { db, storage } from '../../firebaseConfig';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import * as XLSX from 'xlsx';

function ListadoProveedores() {
  const [registros, setRegistros] = useState([]);
  const [registrosFiltrados, setRegistrosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');

  useEffect(() => {
    obtenerRegistros();
  }, []);

  useEffect(() => {
    let resultado = [...registros];

    if (busqueda.trim() !== '') {
      resultado = resultado.filter(f =>
        f.proveedor.toLowerCase().includes(busqueda.toLowerCase()) ||
        f.concepto.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (fechaInicio) {
      const desde = new Date(fechaInicio);
      resultado = resultado.filter(f => f.fechaCarga.toDate() >= desde);
    }

    if (fechaFin) {
      const hasta = new Date(fechaFin);
      resultado = resultado.filter(f => f.fechaCarga.toDate() <= hasta);
    }

    if (montoMin) {
      resultado = resultado.filter(f => f.monto >= parseFloat(montoMin));
    }

    if (montoMax) {
      resultado = resultado.filter(f => f.monto <= parseFloat(montoMax));
    }

    setRegistrosFiltrados(resultado);
  }, [busqueda, fechaInicio, fechaFin, montoMin, montoMax, registros]);

  const obtenerRegistros = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'facturasProveedores'), orderBy('fechaCarga', 'desc'));
      const snap = await getDocs(q);
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistros(lista);
    } catch (error) {
      console.error('Error al leer proveedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const eliminarRegistro = async (item) => {
    if (!window.confirm('¿Eliminar esta factura de proveedor?')) return;

    try {
      await deleteDoc(doc(db, 'facturasProveedores', item.id));

      if (item.archivoUrl) {
        const archivoRef = ref(storage, `facturas_proveedores/${item.archivoNombre}`);
        await deleteObject(archivoRef);
      }

      setMensaje('Registro eliminado correctamente.');
      obtenerRegistros();
    } catch (error) {
      console.error('❌ Error al eliminar:', error);
      setMensaje('No se pudo eliminar el registro.');
    }
  };

  const exportarExcel = () => {
    const data = registrosFiltrados.map(item => ({
      Proveedor: item.proveedor,
      CUIT: item.cuit,
      Concepto: item.concepto,
      Monto: item.monto,
      Fecha: item.fechaCarga?.toDate().toLocaleDateString() || '',
      Archivo: item.archivoNombre || 'Sin archivo'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
    XLSX.writeFile(wb, 'facturas_proveedores.xlsx');
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Facturas de Proveedores</h1>

        {mensaje && (
          <p className="text-green-600 mb-4 font-medium">{mensaje}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Proveedor o concepto..."
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
          <button
            onClick={exportarExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded"
          >
            Exportar a Excel
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Cargando registros...</p>
        ) : registrosFiltrados.length === 0 ? (
          <p className="text-gray-600">No hay facturas cargadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow-md text-sm">
              <thead>
                <tr className="bg-gray-200 text-left text-gray-700">
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">CUIT</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3">Monto</th>
                  <th className="p-3">Archivo</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{item.proveedor}</td>
                    <td className="p-3">{item.cuit}</td>
                    <td className="p-3">{item.concepto}</td>
                    <td className="p-3">${item.monto.toFixed(2)}</td>
                    <td className="p-3">
                      {item.archivoUrl ? (
                        <a
                          href={item.archivoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Ver archivo
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">Sin archivo</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => eliminarRegistro(item)}
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
        )}
      </main>
    </div>
  );
}

export default ListadoProveedores;
