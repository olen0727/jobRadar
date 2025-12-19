import React from 'react'
import ReactDOM from 'react-dom/client'
import { Options } from './Options'


const root = document.getElementById('root');
if (!root) {
    console.error('Root element not found');
    throw new Error('Root element not found');
}

console.log('Mounting Options page...');

try {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <Options />
        </React.StrictMode>,
    );
    console.log('Options page mounted successfully');
} catch (error) {
    console.error('Failed to mount Options page:', error);
    root.innerHTML = `<div style="color:red; padding:20px;">
    <h1>Error Loading Settings</h1>
    <pre>${error instanceof Error ? error.message : JSON.stringify(error)}</pre>
  </div>`;
}
