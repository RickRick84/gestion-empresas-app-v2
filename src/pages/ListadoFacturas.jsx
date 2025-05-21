import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import Sidebar from '../components/Sidebar';
import * as XLSX from 'xlsx';
import { logActividad } from '../utils/logActividad';

function ListadoFacturas() {
  const [facturas, setFacturas] = useState([]);
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');

  useEffect(() => {
    fetchFacturas();
  }, []);

  useEffect(() => {
    let resultado = [...facturas];

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

    setFacturasFiltradas(resultado);
  }, [busqueda, fechaInicio, fechaFin, montoMin, montoMax, facturas]);

  const fetchFacturas = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'facturas'), orderBy('creadaEn', 'desc'));
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFacturas(lista);
      setFacturasFiltradas(lista);
    } catch (error) {
      console.error('Error al obtener facturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const eliminarFactura = async (id) => {
    if (!window.confirm('¿Eliminar esta factura de forma permanente?')) return;
    try {
      const ref = doc(db, 'facturas', id);
      const facturaEliminada = facturas.find(f => f.id === id);
      await deleteDoc(ref);
      await logActividad({
        tipo: 'baja',
        modulo: 'facturacion',
        descripcion: `Factura eliminada: Cliente ${facturaEliminada?.cliente}, Concepto ${facturaEliminada?.concepto}, Monto $${facturaEliminada?.monto}`,
        usuario: 'desconocido'
      });
      setMensaje('Factura eliminada.');
      fetchFacturas();
    } catch (error) {
      console.error('❌ Error al eliminar:', error);
      setMensaje('No se pudo eliminar la factura.');
    }
  };

  const verFactura = (factura) => {
    alert(
      `Cliente: ${factura.cliente}\n` +
      `Fecha: ${factura.fecha.toDate().toLocaleDateString()}\n` +
      `Concepto: ${factura.concepto}\n` +
      `Monto: $${factura.monto.toFixed(2)}\n` +
      `Detalle: ${factura.detalle || '-'}`
    );
  };

  const exportarExcel = () => {
    const data = facturasFiltradas.map(f => ({
      Cliente: f.cliente,
      Fecha: f.fecha?.toDate().toLocaleDateString() || '',
      Concepto: f.concepto,
      Cantidad: f.cantidad || 1,
      Monto: f.monto,
      Detalle: f.detalle || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, 'listado_facturas.xlsx');
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Listado de Facturas</h1>

        {mensaje && (
          <p className="text-green-600 mb-4 font-medium">{mensaje}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
          <button
            onClick={exportarExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded"
          >
            Exportar a Excel
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Cargando facturas...</p>
        ) : facturasFiltradas.length === 0 ? (
          <p className="text-gray-600">No se encontraron resultados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow-md text-sm">
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
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{factura.cliente}</td>
                    <td className="p-3">
                      {factura.fecha?.toDate().toLocaleDateString()}
                    </td>
                    <td className="p-3">{factura.concepto}</td>
                    <td className="p-3">${factura.monto.toFixed(2)}</td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button
                        onClick={() => verFactura(factura)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => eliminarFactura(factura.id)}
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

export default ListadoFacturas;
