import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import ExcelJS from 'exceljs';
import { logActividad } from '../utils/logActividad';

function Stock() {
  const [productos, setProductos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('unidad');
  const [fechaElaboracion, setFechaElaboracion] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [minCantidad, setMinCantidad] = useState('');
  const [maxCantidad, setMaxCantidad] = useState('');
  const [filtrados, setFiltrados] = useState([]);

  useEffect(() => {
    obtenerStock();
  }, []);

  useEffect(() => {
    let resultado = [...productos];

    if (busqueda.trim() !== '') {
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (minCantidad) {
      resultado = resultado.filter(p => p.cantidad >= parseInt(minCantidad));
    }

    if (maxCantidad) {
      resultado = resultado.filter(p => p.cantidad <= parseInt(maxCantidad));
    }

    setFiltrados(resultado);
  }, [productos, busqueda, minCantidad, maxCantidad]);

  const obtenerStock = async () => {
    try {
      const q = query(collection(db, 'stock'), orderBy('nombre'));
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(lista);
    } catch (error) {
      console.error('❌ Error al obtener stock:', error);
    }
  };

  const agregarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !cantidad || !unidad || !fechaElaboracion || !fechaVencimiento) {
      setMensaje('Debe completar todos los campos obligatorios.');
      return;
    }

    const nombreNormalizado = nombre.trim().toLowerCase();
    const existe = productos.some(p => p.nombre.trim().toLowerCase() === nombreNormalizado);

    if (existe) {
      setMensaje(`Ya existe un producto llamado "${nombre}".`);
      return;
    }

    try {
      await addDoc(collection(db, 'stock'), {
        nombre: nombre.trim(),
        cantidad: parseInt(cantidad),
        unidad,
        fechaElaboracion: Timestamp.fromDate(new Date(fechaElaboracion)),
        fechaVencimiento: Timestamp.fromDate(new Date(fechaVencimiento))
      });

      await logActividad({
        tipo: 'alta',
        modulo: 'stock',
        descripcion: `Producto agregado: ${nombre.trim()} (${cantidad} ${unidad})`
      });

      setMensaje('Producto agregado correctamente.');
      setNombre('');
      setCantidad('');
      setUnidad('unidad');
      setFechaElaboracion('');
      setFechaVencimiento('');
      obtenerStock();
    } catch (error) {
      console.error('❌ Error al agregar producto:', error);
      setMensaje('No se pudo guardar el producto.');
    }
  };

  const ajustarCantidad = async (id, nuevaCantidad) => {
    try {
      const producto = productos.find(p => p.id === id);
      if (!producto) return;

      await updateDoc(doc(db, 'stock', id), {
        cantidad: nuevaCantidad,
      });

      await logActividad({
        tipo: 'ajuste',
        modulo: 'stock',
        descripcion: `Stock ajustado: ${producto.nombre} (de ${producto.cantidad} a ${nuevaCantidad})`
      });

      obtenerStock();
    } catch (error) {
      console.error('❌ Error al actualizar cantidad:', error);
    }
  };

  const eliminarProducto = async (id) => {
    try {
      const producto = productos.find(p => p.id === id);
      if (!producto) return;

      await deleteDoc(doc(db, 'stock', id));

      await logActividad({
        tipo: 'baja',
        modulo: 'stock',
        descripcion: `Producto eliminado: ${producto.nombre}`
      });

      obtenerStock();
    } catch (error) {
      console.error('❌ Error al eliminar producto:', error);
    }
  };

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Stock');

    sheet.columns = [
      { header: 'Producto', key: 'producto', width: 30 },
      { header: 'Cantidad', key: 'cantidad', width: 15 },
      { header: 'Unidad', key: 'unidad', width: 15 },
      { header: 'Elaboración', key: 'elaboracion', width: 20 },
      { header: 'Vencimiento', key: 'vencimiento', width: 20 }
    ];

    filtrados.forEach((p) => {
      sheet.addRow({
        producto: p.nombre,
        cantidad: p.cantidad,
        unidad: p.unidad,
        elaboracion: p.fechaElaboracion?.toDate().toLocaleDateString() || '',
        vencimiento: p.fechaVencimiento?.toDate().toLocaleDateString() || ''
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_actual.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Control de Stock</h1>

        {mensaje && (
          <p className={`mb-4 font-medium ${mensaje.includes('Ya existe') || mensaje.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
            {mensaje}
          </p>
        )}

        <form onSubmit={agregarProducto} className="mb-4 bg-white p-4 rounded shadow-md max-w-lg space-y-3">
          {/* campos del formulario */}
        </form>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input type="text" placeholder="Buscar por nombre..." className="px-3 py-2 border rounded" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <input type="number" placeholder="Cantidad mínima" className="px-3 py-2 border rounded" value={minCantidad} onChange={(e) => setMinCantidad(e.target.value)} />
          <input type="number" placeholder="Cantidad máxima" className="px-3 py-2 border rounded" value={maxCantidad} onChange={(e) => setMaxCantidad(e.target.value)} />
          <button onClick={exportarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded">
            Exportar Stock a Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-white shadow rounded text-sm">
            <thead>
              <tr className="bg-gray-200 text-left text-gray-700">
                <th className="p-3">Producto</th>
                <th className="p-3">Cantidad</th>
                <th className="p-3">Unidad</th>
                <th className="p-3">Vencimiento</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => {
                const diasRestantes = item.fechaVencimiento?.toDate() - new Date();
                const alerta = diasRestantes <= 1000 * 60 * 60 * 24 * 30;
                return (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{item.nombre}</td>
                    <td className="p-3">{item.cantidad}</td>
                    <td className="p-3">{item.unidad}</td>
                    <td className="p-3">
                      {item.fechaVencimiento?.toDate().toLocaleDateString() || '-'}
                      {alerta && <span className="ml-2 text-red-600 font-semibold">⚠ Próximo a vencer</span>}
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => {
                          const nueva = prompt('Nueva cantidad:', item.cantidad);
                          if (nueva !== null && !isNaN(nueva)) {
                            ajustarCantidad(item.id, parseInt(nueva));
                          }
                        }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Ajustar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de eliminar "${item.nombre}"?`)) {
                            eliminarProducto(item.id);
                          }
                        }}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default Stock;
