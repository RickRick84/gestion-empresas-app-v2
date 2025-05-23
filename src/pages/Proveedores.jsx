import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { db, storage } from '../../firebaseConfig';
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

function Proveedores() {
  const [proveedor, setProveedor] = useState('');
  const [cuit, setCuit] = useState('');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setLoading(true);

    if (!proveedor || !cuit || !concepto || !monto) {
      setMensaje('Complete todos los campos obligatorios.');
      setLoading(false);
      return;
    }

    try {
      // Verificar duplicado por proveedor + CUIT
      const q = query(
        collection(db, 'facturasProveedores'),
        where('proveedor', '==', proveedor),
        where('cuit', '==', cuit)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setMensaje('Ya existe una factura cargada para este proveedor con ese CUIT.');
        setLoading(false);
        return;
      }

      let archivoUrl = '';
      let nombreUnico = '';

      if (archivo) {
        const esValido = archivo.type.includes('pdf') || archivo.type.includes('image');
        const esPequeño = archivo.size < 10 * 1024 * 1024;

        if (!esValido) {
          setMensaje('Solo se permiten archivos PDF o imágenes.');
          setLoading(false);
          return;
        }

        if (!esPequeño) {
          setMensaje('El archivo no puede superar los 10 MB.');
          setLoading(false);
          return;
        }

        nombreUnico = `${Date.now()}_${archivo.name}`;
        const archivoRef = ref(storage, `facturas_proveedores/${nombreUnico}`);

        try {
          await uploadBytes(archivoRef, archivo);
          archivoUrl = await getDownloadURL(archivoRef);
        } catch (error) {
          console.error('❌ Error al subir archivo:', error);
          setMensaje('Error al subir el archivo.');
          setLoading(false);
          return;
        }
      }

      const datos = {
        proveedor,
        cuit,
        concepto,
        monto: parseFloat(monto),
        fechaCarga: Timestamp.now(),
        archivoUrl,
        archivoNombre: nombreUnico || 'Sin archivo'
      };

      await addDoc(collection(db, 'facturasProveedores'), datos);
      setMensaje('Factura cargada con éxito.');
      setProveedor('');
      setCuit('');
      setConcepto('');
      setMonto('');
      setArchivo(null);

      setTimeout(() => {
        navigate('/proveedores/listado');
      }, 1500);
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      setMensaje('Error al guardar la factura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Cargar Factura de Proveedor</h1>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-xl space-y-4">
          {mensaje && (
            <div className={`text-center text-sm font-medium ${mensaje.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {mensaje}
            </div>
          )}

          <div>
            <label className="block font-medium mb-1">Nombre del Proveedor *</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">CUIT *</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Concepto *</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Monto *</label>
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Subir archivo (PDF o imagen)</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setArchivo(e.target.files[0])}
              className="w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
          >
            {loading ? 'Guardando...' : 'Cargar Factura'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default Proveedores;
