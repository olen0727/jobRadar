import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, defineManifest } from '@crxjs/vite-plugin'

const manifest = defineManifest({
  manifest_version: 3,
  name: 'JobRadar AI',
  version: '1.0.0',
  action: {
    default_popup: 'index.html',
  },
  side_panel: {
    default_path: 'sidepanel.html',
  },
  options_ui: {
    page: 'options.html',
    open_in_tab: true,
  },
  permissions: ['storage', 'activeTab', 'scripting', 'sidePanel'],
  host_permissions: ['https://api.openai.com/*'],
})

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
