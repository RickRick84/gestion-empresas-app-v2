import React, { useEffect, useState } from 'react';
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
  orderBy
} from 'firebase/firestore';
import { logActividad } from '../utils/logActividad';

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [nuevo, setNuevo] = useState({ nombre: '', cuit: '', iva: '' });
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      const q = query(collection(db, 'Clientes'), orderBy('Nombre'));
      const snap = await getDocs(q);
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClientes(lista);
    } catch (err) {
      console.error('❌ Error al obtener clientes:', err);
    }
  };

  const agregarCliente = async (e) => {
    e.preventDefault();
    if (!nuevo.nombre || !nuevo.cuit || !nuevo.iva) {
      setMensaje('Complete todos los campos.');
      return;
    }

    try {
      await addDoc(collection(db, 'Clientes'), {
        Nombre: nuevo.nombre,
        CUIT: nuevo.cuit,
        'Status IVA': nuevo.iva,
        Activo: true
      });

      await logActividad({
        tipo: 'alta',
        modulo: 'clientes',
        descripcion: `Nuevo cliente creado: ${nuevo.nombre} (${nuevo.cuit})`,
        usuario: 'desconocido'
      });

      setMensaje('Cliente agregado.');
      setNuevo({ nombre: '', cuit: '', iva: '' });
      cargarClientes();
    } catch (err) {
      console.error('❌ Error al agregar cliente:', err);
      setMensaje('Error al agregar cliente.');
    }
  };

  const eliminarCliente = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar cliente "${nombre}"?`)) return;
    try {
      await deleteDoc(doc(db, 'Clientes', id));
      await logActividad({
        tipo: 'baja',
        modulo: 'clientes',
        descripcion: `Cliente eliminado: ${nombre}`,
        usuario: 'desconocido'
      });
      cargarClientes();
    } catch (err) {
      console.error('❌ Error al eliminar cliente:', err);
      setMensaje('Error al eliminar.');
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Gestión de Clientes</h1>

        {mensaje && <p className="text-green-600 mb-4 font-medium">{mensaje}</p>}

        <form onSubmit={agregarCliente} className="bg-white p-4 rounded shadow max-w-xl space-y-4 mb-6">
          <div>
            <label className="block font-medium mb-1">Nombre</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">CUIT</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={nuevo.cuit}
              onChange={(e) => setNuevo({ ...nuevo, cuit: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Condición IVA</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={nuevo.iva}
              onChange={(e) => setNuevo({ ...nuevo, iva: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="bg-green-600 text-white font-bold px-4 py-2 rounded">
            Agregar Cliente
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full bg-white shadow rounded text-sm">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">CUIT</th>
                <th className="p-3 text-left">Condición IVA</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{c.Nombre}</td>
                  <td className="p-3">{c.CUIT}</td>
                  <td className="p-3">{c['Status IVA']}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => eliminarCliente(c.id, c.Nombre)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
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

export default Clientes;
