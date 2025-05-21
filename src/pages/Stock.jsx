import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { logActividad } from '../utils/logActividad';

function Stock() {
  const [productos, setProductos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
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
    if (!nombre || !cantidad) {
      setMensaje('Debe completar ambos campos.');
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
      });

      await logActividad({
        tipo: 'alta',
        modulo: 'stock',
        descripcion: `Producto agregado: ${nombre.trim()} (${cantidad} unidades)`
      });

      setMensaje('Producto agregado correctamente.');
      setNombre('');
      setCantidad('');
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

  const exportarExcel = () => {
    const data = filtrados.map(p => ({
      Producto: p.nombre,
      Cantidad: p.cantidad
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, 'stock_actual.xlsx');
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Control de Stock</h1>

        {mensaje && (
          <p className={`mb-4 font-medium ${mensaje.includes('Ya existe') || mensaje.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
            {mensaje}
          </p>
        )}

        <form onSubmit={agregarProducto} className="mb-6 bg-white p-4 rounded shadow-md max-w-md space-y-3">
          <div>
            <label className="block font-medium mb-1">Nombre del Producto *</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Cantidad *</label>
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
          >
            Agregar al Stock
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            className="px-3 py-2 border rounded"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <input
            type="number"
            placeholder="Cantidad mínima"
            className="px-3 py-2 border rounded"
            value={minCantidad}
            onChange={(e) => setMinCantidad(e.target.value)}
          />
          <input
            type="number"
            placeholder="Cantidad máxima"
            className="px-3 py-2 border rounded"
            value={maxCantidad}
            onChange={(e) => setMaxCantidad(e.target.value)}
          />
          <button
            onClick={exportarExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded"
          >
            Exportar Stock a Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-white shadow rounded text-sm">
            <thead>
              <tr className="bg-gray-200 text-left text-gray-700">
                <th className="p-3">Producto</th>
                <th className="p-3">Cantidad</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{item.nombre}</td>
                  <td className="p-3">{item.cantidad}</td>
                  <td className="p-3 text-center">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default Stock;
