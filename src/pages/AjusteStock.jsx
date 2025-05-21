import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  query
} from 'firebase/firestore';

function AjusteStock() {
  const [productos, setProductos] = useState([]);
  const [ajustes, setAjustes] = useState({});
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    obtenerStock();
  }, []);

  const obtenerStock = async () => {
    try {
      const q = query(collection(db, 'stock'), orderBy('nombre'));
      const snap = await getDocs(q);
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(lista);
    } catch (error) {
      console.error('❌ Error al leer stock:', error);
    }
  };

  const aplicarAjuste = async (id) => {
    const ajuste = ajustes[id];
    if (!ajuste || isNaN(ajuste.cantidad) || ajuste.cantidad <= 0) return;

    const producto = productos.find(p => p.id === id);
    const nuevoStock = producto.cantidad - ajuste.cantidad;

    if (nuevoStock < 0) {
      setMensaje(`No puede descontar más unidades de las que hay en "${producto.nombre}".`);
      return;
    }

    try {
      await updateDoc(doc(db, 'stock', id), { cantidad: nuevoStock });
      setMensaje(`Stock ajustado para "${producto.nombre}".`);
      obtenerStock();
      setAjustes((prev) => ({ ...prev, [id]: { cantidad: '', motivo: '' } }));
    } catch (err) {
      console.error('❌ Error al ajustar stock:', err);
      setMensaje('Error al ajustar el stock.');
    }
  };

  const actualizarCampo = (id, campo, valor) => {
    setAjustes(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor
      }
    }));
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Ajuste Manual de Stock</h1>

        {mensaje && <p className="mb-4 text-center text-sm font-medium text-green-600">{mensaje}</p>}

        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded shadow text-sm">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="p-3 text-left">Producto</th>
                <th className="p-3 text-left">Stock Actual</th>
                <th className="p-3 text-left">Descontar</th>
                <th className="p-3 text-left">Motivo</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{p.nombre}</td>
                  <td className="p-3">{p.cantidad}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      className="w-20 border p-1 rounded"
                      value={ajustes[p.id]?.cantidad || ''}
                      onChange={(e) => actualizarCampo(p.id, 'cantidad', e.target.value)}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      className="w-full border p-1 rounded"
                      value={ajustes[p.id]?.motivo || ''}
                      onChange={(e) => actualizarCampo(p.id, 'motivo', e.target.value)}
                      placeholder="Ej: Caja rota"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => aplicarAjuste(p.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    >
                      Aplicar
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

export default AjusteStock;
