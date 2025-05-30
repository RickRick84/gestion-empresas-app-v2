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
import ExcelJS from 'exceljs';
import { logActividad } from '../utils/logActividad';

function ListadoProveedores() {
  const [registros, setRegistros] = useState([]);
  const [registrosFiltrados, setRegistrosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');

  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [conceptoFiltro, setConceptoFiltro] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');

  const [proveedoresDisponibles, setProveedoresDisponibles] = useState([]);
  const [conceptosDisponibles, setConceptosDisponibles] = useState([]);

  useEffect(() => {
    obtenerRegistros();
  }, []);

  useEffect(() => {
    let resultado = [...registros];

    if (proveedorFiltro) {
      resultado = resultado.filter(f => f.proveedor === proveedorFiltro);
    }

    if (conceptoFiltro) {
      resultado = resultado.filter(f => f.concepto === conceptoFiltro);
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
  }, [proveedorFiltro, conceptoFiltro, fechaInicio, fechaFin, montoMin, montoMax, registros]);

  const obtenerRegistros = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'facturasProveedores'), orderBy('fechaCarga', 'desc'));
      const snap = await getDocs(q);
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistros(lista);

      // Cargar listas únicas para filtros
      const proveedores = [...new Set(lista.map(r => r.proveedor))];
      const conceptos = [...new Set(lista.map(r => r.concepto))];
      setProveedoresDisponibles(proveedores);
      setConceptosDisponibles(conceptos);
    } catch (error) {
      console.error('❌ Error al leer proveedores:', error);
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

      await logActividad({
        tipo: 'baja',
        modulo: 'proveedores',
        descripcion: `Factura de proveedor eliminada: ${item.proveedor}, Concepto: ${item.concepto}, Monto: $${item.monto}`,
        usuario: 'Admin'
      });

      setMensaje('Registro eliminado correctamente.');
      obtenerRegistros();
    } catch (error) {
      console.error('❌ Error al eliminar:', error);
      setMensaje('No se pudo eliminar el registro.');
    }
  };

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Facturas Proveedores');

    sheet.columns = [
      { header: 'Proveedor', key: 'proveedor', width: 25 },
      { header: 'CUIT', key: 'cuit', width: 20 },
      { header: 'Concepto', key: 'concepto', width: 25 },
      { header: 'Monto', key: 'monto', width: 15 },
      { header: 'Primer Vencimiento', key: 'venc1', width: 20 },
      { header: 'Segundo Vencimiento', key: 'venc2', width: 20 },
      { header: 'Observaciones', key: 'obs', width: 40 },
      { header: 'Fecha de Carga', key: 'fechaCarga', width: 20 },
      { header: 'Archivo', key: 'archivo', width: 35 }
    ];

    registrosFiltrados.forEach((r) => {
      sheet.addRow({
        proveedor: r.proveedor,
        cuit: r.cuit,
        concepto: r.concepto,
        monto: r.monto,
        venc1: r.primerVencimiento?.toDate().toLocaleDateString() || '',
        venc2: r.segundoVencimiento?.toDate().toLocaleDateString() || '',
        obs: r.observaciones || '',
        fechaCarga: r.fechaCarga?.toDate().toLocaleDateString() || '',
        archivo: r.archivoNombre || 'Sin archivo'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'facturas_proveedores.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Facturas de Proveedores</h1>

        {mensaje && <p className="text-green-600 mb-4 font-medium">{mensaje}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select
            value={proveedorFiltro}
            onChange={(e) => setProveedorFiltro(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="">Proveedor...</option>
            {proveedoresDisponibles.map((p, i) => (
              <option key={i} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={conceptoFiltro}
            onChange={(e) => setConceptoFiltro(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="">Concepto...</option>
            {conceptosDisponibles.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

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
          <p className="text-gray-600">No hay facturas encontradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded shadow text-sm">
              <thead>
                <tr className="bg-gray-200 text-gray-700 text-left">
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">CUIT</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3">Monto</th>
                  <th className="p-3">1° Vto</th>
                  <th className="p-3">2° Vto</th>
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
                    <td className="p-3">{item.primerVencimiento?.toDate().toLocaleDateString() || '-'}</td>
                    <td className="p-3">{item.segundoVencimiento?.toDate().toLocaleDateString() || '-'}</td>
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
