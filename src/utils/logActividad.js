import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export const logActividad = async ({ tipo, modulo, descripcion, usuario = 'desconocido' }) => {
  try {
    await addDoc(collection(db, 'historial'), {
      tipo,          // 'alta', 'baja', 'ajuste', 'login', etc.
      modulo,        // 'facturacion', 'proveedores', 'stock', etc.
      descripcion,   // texto libre tipo 'Factura eliminada - Cliente X'
      usuario,       // extraíble desde context si se implementa más adelante
      fecha: Timestamp.now()
    });
  } catch (error) {
    console.error('❌ Error al registrar actividad:', error);
  }
};
