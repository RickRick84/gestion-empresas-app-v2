import React, { useEffect, useState } from 'react';

function BotModal({ onClose }) {
  const [input, setInput] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  useEffect(() => {
    setChat([
      {
        tipo: 'bot',
        texto: 'Hola, soy tu Asistente Virtual. ¿Cómo puedo ayudarte?'
      }
    ]);
  }, []);

  const enviarPregunta = async () => {
    if (!input.trim() || loading || cooldown) return;

    const nuevaEntrada = { tipo: 'usuario', texto: input };
    const nuevoChat = [...chat, nuevaEntrada];
    setChat(nuevoChat);
    setInput('');
    setLoading(true);
    setCooldown(true);

    // Prepara mensajes para el backend
    const messages = [
      {
        role: 'system',
        content:
          'Eres un asistente virtual para una app empresarial. Sólo puedes responder preguntas relacionadas con el funcionamiento de esta app.'
      },
      ...nuevoChat.map((m) => ({
        role: m.tipo === 'usuario' ? 'user' : 'assistant',
        content: m.texto
      })),
      {
        role: 'user',
        content: input
      }
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      const data = await response.json();
      const textoRespuesta = data.respuesta || '[Sin respuesta]';
      setChat((prev) => [...prev, { tipo: 'bot', texto: textoRespuesta }]);
    } catch (err) {
      console.error(err);
      setChat((prev) => [...prev, { tipo: 'bot', texto: '[Error al conectar con el bot]' }]);
    } finally {
      setLoading(false);
      setTimeout(() => setCooldown(false), 5000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end z-50">
      <div className="bg-white w-full max-w-md rounded-t-lg shadow-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Asistente Virtual</h2>
          <button onClick={onClose} className="text-red-500 text-xl">
            &times;
          </button>
        </div>

        <div className="h-64 overflow-y-auto border p-2 rounded bg-gray-50 text-sm mb-3">
          {chat.map((msg, i) => (
            <div
              key={i}
              className={`mb-2 ${
                msg.tipo === 'usuario' ? 'text-right' : 'text-left'
              }`}
            >
              <span
                className={
                  msg.tipo === 'usuario' ? 'text-blue-600' : 'text-green-700'
                }
              >
                {msg.texto}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviarPregunta()}
            className="flex-1 border rounded p-2 text-sm"
            placeholder="Escriba su consulta..."
          />
          <button
            onClick={enviarPregunta}
            disabled={loading || cooldown}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            {loading ? '...' : cooldown ? 'Espera' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BotModal;
