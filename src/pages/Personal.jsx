import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { logActividad } from '../utils/logActividad';

function Personal() {
  const [usuarios, setUsuarios] = useState([]);
  const [filtro, setFiltro] = useState('semana');

  useEffect(() => {
    const obtenerUsuarios = async () => {
      try {
        const snap = await getDocs(collection(db, 'usuarios'));
        const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsuarios(lista);

        await logActividad({
          tipo: 'consulta',
          modulo: 'personal',
          descripcion: 'Visualización de panel de carga horaria',
          usuario: 'Admin'
        });

      } catch (error) {
        console.error('❌ Error al obtener usuarios:', error);
      }
    };

    obtenerUsuarios();
  }, []);

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Carga Horaria');

    sheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 20 },
      { header: 'Rol', key: 'rol', width: 15 },
      { header: 'Horas Día', key: 'dia', width: 12 },
      { header: 'Horas Semana', key: 'semana', width: 15 },
      { header: 'Horas Mes', key: 'mes', width: 12 },
      { header: 'Horas Año', key: 'año', width: 12 }
    ];

    usuarios.forEach((u) => {
      sheet.addRow({
        nombre: u.nombre,
        rol: u.rol,
        dia: u.horasDia || 0,
        semana: u.horasSemana || 0,
        mes: u.horasMes || 0,
        año: u.horasAño || 0
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'CargaHoraria.xlsx');

    await logActividad({
      tipo: 'descarga',
      modulo: 'personal',
      descripcion: 'Exportación de horarios a Excel',
      usuario: 'Admin'
    });
  };

  const renderizarHoras = (usuario) => {
    switch (filtro) {
      case 'día':
        return usuario.horasDia || 0;
      case 'semana':
        return usuario.horasSemana || 0;
      case 'mes':
        return usuario.horasMes || 0;
      case 'año':
        return usuario.horasAño || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Panel de Personal</h1>
          <button
            onClick={exportarExcel}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Exportar Excel
          </button>
        </div>

        <div className="mb-4">
          <label className="mr-2 font-medium">Ver por:</label>
          <select
            className="border p-2 rounded"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="día">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
            <option value="año">Año</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4">Horas ({filtro})</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4">{u.nombre}</td>
                  <td className="py-2 px-4">{u.rol}</td>
                  <td className="py-2 px-4">{renderizarHoras(u)}</td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-4 px-4 text-center text-gray-500">
                    No hay registros de usuarios aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default Personal;
