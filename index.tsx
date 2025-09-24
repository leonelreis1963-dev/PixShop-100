/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill process.env for the browser environment.
// This needs to run before any modules that might use process.env,
// like geminiService.
// @ts-ignore
if (typeof window.process === 'undefined') {
  // @ts-ignore
  window.process = { env: {} };
}
const savedKey = sessionStorage.getItem('gemini_api_key');
if (savedKey) {
  // @ts-ignore
  window.process.env.API_KEY = savedKey;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);