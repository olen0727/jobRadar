import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  console.error("Popup Render Error:", e);
  document.body.innerHTML = `<div style="color:red; padding:20px;">
    <h3>Popup Error</h3>
    <pre>${e instanceof Error ? e.message : JSON.stringify(e)}</pre>
  </div>`;
}
