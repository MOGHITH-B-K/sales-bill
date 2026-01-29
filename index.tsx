
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Critical Error: Root element '#root' not found in document. JS failed to mount.");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("React Mounting Error:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h2>Application Failed to Load</h2>
      <p>Please check the browser console for details.</p>
    </div>`;
  }
}
