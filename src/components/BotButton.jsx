import React, { useState } from 'react';
import BotModal from './BotModal';

function BotButton() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAbierto(!abierto)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-2xl"
      >
        💬
      </button>

      {abierto && <BotModal onClose={() => setAbierto(false)} />}
    </>
  );
}

export default BotButton;
