import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, defineManifest } from '@crxjs/vite-plugin'

const manifest = defineManifest({
  manifest_version: 3,
  name: 'JobRadar AI',
  description: '你的 AI 職缺分析助手：自動估算通勤、分析匹配度與標記風險，讓求職更高效。',
  version: '1.0.0',
  icons: {
    '16': 'icon-16.png',
    '48': 'icon-48.png',
    '128': 'icon-128.png',
  },
  action: {
    default_popup: 'index.html',
    default_icon: {
      '16': 'icon-16.png',
      '48': 'icon-48.png',
      '128': 'icon-128.png',
    }
  },
  side_panel: {
    default_path: 'sidepanel.html',
  },
  options_ui: {
    page: 'options.html',
    open_in_tab: true,
  },
  permissions: ['storage', 'activeTab', 'scripting', 'sidePanel'],
  host_permissions: [
    'https://api.openai.com/*',
    'https://generativelanguage.googleapis.com/*',
    'https://pabrserjlsgvqbzekbob.supabase.co/*'
  ],
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
