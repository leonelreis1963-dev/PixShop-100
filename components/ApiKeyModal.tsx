/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface ApiKeyModalProps {
  onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-lg w-full flex flex-col gap-4 shadow-2xl shadow-blue-500/10">
        <h2 className="text-2xl font-bold text-gray-100">Chave de API Necessária</h2>
        <p className="text-gray-400">
          Para usar o Pixshop, por favor, insira sua chave de API do Google AI. Sua chave é armazenada com segurança na sessão do seu navegador e nunca é enviada para nossos servidores.
        </p>
        <p className="text-gray-400">
          Você pode obter uma chave de API gratuita no{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Google AI Studio
          </a>.
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Insira sua chave de API aqui"
          className="bg-gray-900 border border-gray-600 text-gray-200 rounded-lg p-3 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full"
        />
        <button
          onClick={handleSave}
          disabled={!apiKey.trim()}
          className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Salvar e Continuar
        </button>
      </div>
    </div>
  );
};

export default ApiKeyModal;