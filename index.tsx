import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  const errorMsg = "Critical Error: Root element '#root' not found. Check index.html.";
  console.error(errorMsg);
  document.body.innerHTML = `<div style="padding: 40px; color: red;">${errorMsg}</div>`;
} else {
  try {
    console.log("React: Initializing Root...");
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("React: Render triggered.");
  } catch (error) {
    console.error("React: Mounting Failure", error);
    rootElement.innerHTML = `
      <div style="padding: 2rem; font-family: system-ui; text-align: center; color: #ef4444;">
        <h1 style="font-size: 1.5rem; font-weight: bold;">Mounting Failure</h1>
        <p style="color: #64748b;">The React application failed to initialize.</p>
        <pre style="text-align: left; background: #f1f5f9; padding: 1rem; font-size: 0.75rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; margin-top: 1rem;">${error instanceof Error ? error.stack : String(error)}</pre>
      </div>
    `;
  }
}