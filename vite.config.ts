import { defineConfig, loadEnv } from 'vite'
import type { Plugin, ViteDevServer, PreviewServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { handleAiRequest, handleStatusRequest } from './server/ai/aiRoutes.mjs'

// Configuración de Vite con proxy seguro para CoinGecko y middleware para AI Analyst
export default defineConfig(({ mode }) => {
  // Carga variables de entorno del servidor sin exponer claves en el cliente
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.COINGECKO_API_KEY || ''

  // Asegura variables de entorno de servidor disponibles para el adaptador de Gemini
  if (env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY
  }
  if (env.GEMINI_MODEL) {
    process.env.GEMINI_MODEL = env.GEMINI_MODEL
  }

  const proxyConfig = {
    target: 'https://api.coingecko.com/api/v3',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/coingecko/, ''),
    headers: apiKey ? { 'x-cg-demo-api-key': apiKey } : {},
  }

  // Middleware integrado para desarrollo con Vite (evita procesos secundarios)
  const aiAnalystPlugin: Plugin = {
    name: 'ai-analyst-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
        const url = req.url ? req.url.split('?')[0] : ''
        if (url === '/api/ai/analyst') {
          handleAiRequest(req, res)
        } else if (url === '/api/ai/status') {
          handleStatusRequest(req, res)
        } else {
          next()
        }
      })
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
        const url = req.url ? req.url.split('?')[0] : ''
        if (url === '/api/ai/analyst') {
          handleAiRequest(req, res)
        } else if (url === '/api/ai/status') {
          handleStatusRequest(req, res)
        } else {
          next()
        }
      })
    },
  }

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      aiAnalystPlugin,
    ],
    server: {
      proxy: {
        '/api/coingecko': proxyConfig,
      },
    },
    preview: {
      proxy: {
        '/api/coingecko': proxyConfig,
      },
    },
  }
})
