import React, { useState, useEffect } from 'react';
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
import { logActividad } from '../utils/logActividad';

function Proveedores() {
  const [proveedor, setProveedor] = useState('');
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState([]);
  const [cuit, setCuit] = useState('');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [primerVencimiento, setPrimerVencimiento] = useState('');
  const [segundoVencimiento, setSegundoVencimiento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const cargarProveedores = async () => {
      try {
        const snap = await getDocs(collection(db, 'Clientes'));
        const lista = snap.docs.map(doc => doc.data().Nombre);
        setProveedoresDisponibles(lista);
      } catch (err) {
        console.error('❌ Error al cargar clientes:', err);
      }
    };
    cargarProveedores();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setLoading(true);

    if (!proveedor || !cuit || !concepto || !monto || !primerVencimiento || !segundoVencimiento) {
      setMensaje('Complete todos los campos obligatorios.');
      setLoading(false);
      return;
    }

    try {
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
        primerVencimiento: Timestamp.fromDate(new Date(primerVencimiento)),
        segundoVencimiento: Timestamp.fromDate(new Date(segundoVencimiento)),
        observaciones: observaciones.trim(),
        archivoUrl,
        archivoNombre: nombreUnico || 'Sin archivo',
        fechaCarga: Timestamp.now()
      };

      await addDoc(collection(db, 'facturasProveedores'), datos);

      await logActividad({
        tipo: 'alta',
        modulo: 'proveedores',
        descripcion: `Factura cargada: ${proveedor}, CUIT ${cuit}, Monto $${monto}, Concepto: ${concepto}`,
        usuario: 'desconocido'
      });

      setMensaje('Factura cargada con éxito.');
      setProveedor('');
      setCuit('');
      setConcepto('');
      setMonto('');
      setPrimerVencimiento('');
      setSegundoVencimiento('');
      setObservaciones('');
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
            <select
              className="w-full border p-2 rounded"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              required
            >
              <option value="">Seleccione un proveedor...</option>
              {proveedoresDisponibles.map((nombre, i) => (
                <option key={i} value={nombre}>{nombre}</option>
              ))}
            </select>
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
            <label className="block font-medium mb-1">Primer Vencimiento *</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={primerVencimiento}
              onChange={(e) => setPrimerVencimiento(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Segundo Vencimiento *</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={segundoVencimiento}
              onChange={(e) => setSegundoVencimiento(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Observaciones (opcional)</label>
            <textarea
              className="w-full border p-2 rounded"
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
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

        <div className="mt-4 max-w-xl">
          <button
            onClick={() => navigate('/proveedores/listado')}
            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-100"
          >
            Ver facturas cargadas
          </button>
        </div>
      </main>
    </div>
  );
}

export default Proveedores;
