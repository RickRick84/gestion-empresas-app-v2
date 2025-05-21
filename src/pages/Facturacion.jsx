import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import { logActividad } from '../utils/logActividad';

function Facturacion() {
  const [cliente, setCliente] = useState('');
  const [fecha, setFecha] = useState('');
  const [concepto, setConcepto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [monto, setMonto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');

    if (!cliente || !fecha || !concepto || !monto || !cantidad) {
      setMensaje('Todos los campos obligatorios deben estar completos.');
      return;
    }

    const cantidadSolicitada = parseInt(cantidad);
    if (cantidadSolicitada <= 0) {
      setMensaje('La cantidad debe ser mayor a cero.');
      return;
    }

    try {
      const q = query(collection(db, 'stock'), where('nombre', '==', concepto));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMensaje(`No existe un producto en stock llamado "${concepto}".`);
        return;
      }

      const producto = snapshot.docs[0];
      const stockActual = producto.data().cantidad;

      if (stockActual < cantidadSolicitada) {
        setMensaje(`Stock insuficiente para "${concepto}". Solo hay ${stockActual} unidades disponibles.`);
        return;
      }

      const factura = {
        cliente,
        fecha: Timestamp.fromDate(new Date(fecha)),
        concepto,
        cantidad: cantidadSolicitada,
        monto: parseFloat(monto),
        detalle,
        creadaEn: Timestamp.now()
      };

      await addDoc(collection(db, 'facturas'), factura);

      await updateDoc(doc(db, 'stock', producto.id), {
        cantidad: stockActual - cantidadSolicitada
      });

      await logActividad({
        tipo: 'alta',
        modulo: 'facturacion',
        descripcion: `Factura creada para ${cliente} por ${cantidadSolicitada} unidad(es) de ${concepto} ($${monto})`,
        usuario: 'desconocido'
      });

      setMensaje(`Factura guardada y se descontaron ${cantidadSolicitada} unidades del stock.`);

      setCliente('');
      setFecha('');
      setConcepto('');
      setCantidad('');
      setMonto('');
      setDetalle('');
    } catch (error) {
      console.error('❌ Error al guardar factura:', error);
      setMensaje('Error al guardar la factura.');
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Facturación</h1>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-full max-w-xl space-y-4">
          {mensaje && (
            <div className={`text-center text-sm font-medium ${mensaje.includes('Error') || mensaje.includes('insuficiente') ? 'text-red-600' : 'text-green-600'}`}>
              {mensaje}
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-medium mb-1">Cliente *</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-2 rounded"
              placeholder="Nombre del cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Fecha *</label>
            <input
              type="date"
              className="w-full border border-gray-300 p-2 rounded"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Concepto (Producto) *</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-2 rounded"
              placeholder="Nombre del producto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Cantidad *</label>
            <input
              type="number"
              className="w-full border border-gray-300 p-2 rounded"
              placeholder="Cantidad a facturar"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Monto *</label>
            <input
              type="number"
              className="w-full border border-gray-300 p-2 rounded"
              placeholder="Importe total"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Detalle</label>
            <textarea
              className="w-full border border-gray-300 p-2 rounded"
              rows={3}
              placeholder="Descripción adicional (opcional)"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
          >
            Generar Factura
          </button>
        </form>
      </main>
    </div>
  );
}

export default Facturacion;
