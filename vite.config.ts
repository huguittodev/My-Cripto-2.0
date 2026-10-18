import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// Configuración de Vite con proxy seguro para CoinGecko (resuelve CORS y protege credenciales)
export default defineConfig(({ mode }) => {
  // Carga variables de entorno del servidor sin exponer claves en el cliente
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.COINGECKO_API_KEY || ''

  const proxyConfig = {
    target: 'https://api.coingecko.com/api/v3',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/coingecko/, ''),
    headers: apiKey ? { 'x-cg-demo-api-key': apiKey } : {},
  }

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
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
