// Servidor proxy de producción para My Crypto 2.0 (cero dependencias externas)
// Resuelve CORS, protege la clave de API CoinGecko en el servidor y sirve la SPA compilada

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga variables de entorno locales si existen en el entorno de ejecución
try {
  if (typeof process.loadEnvFile === 'function') {
    if (fs.existsSync('.env.local')) {
      process.loadEnvFile('.env.local');
    } else if (fs.existsSync('.env')) {
      process.loadEnvFile('.env');
    }
  }
} catch {
  // Ignora si ya están presentes en las variables del sistema
}

const DIST_DIR = path.resolve(__dirname, '../dist');
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.COINGECKO_API_KEY || '';

// Tipos MIME comunes para servir archivos estáticos compilados
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Reenvía peticiones a CoinGecko de forma segura sin exponer claves al navegador
function proxyToCoinGecko(req, res) {
  const targetPath = req.url.replace(/^\/api\/coingecko/, '');
  const targetUrl = new URL(`https://api.coingecko.com/api/v3${targetPath}`);

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'MyCrypto2.0-Terminal/1.0',
  };

  if (API_KEY) {
    headers['x-cg-demo-api-key'] = API_KEY;
  }

  const options = {
    hostname: targetUrl.hostname,
    port: 443,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // Garantiza cabeceras CORS para que el navegador jamás bloquee respuestas 429/5xx
    const resHeaders = {
      ...proxyRes.headers,
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization',
    };

    res.writeHead(proxyRes.statusCode || 500, resHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[Proxy Error]:', err.message);
    res.writeHead(502, {
      'Content-Type': 'application/json',
      'access-control-allow-origin': '*',
    });
    res.end(JSON.stringify({ error: 'Error al conectar con CoinGecko mediante proxy.' }));
  });

  if (req.method === 'GET' || req.method === 'HEAD') {
    proxyReq.end();
  } else {
    req.pipe(proxyReq);
  }
}

// Sirve archivos estáticos generados por Vite o redirige a index.html (SPA Fallback)
function serveStatic(req, res) {
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);

  // Si no existe el archivo solicitado, sirve index.html para soportar rutas client-side
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Build no encontrado. Ejecuta `npm run build` primero.');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error al leer archivo estático.');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  // Manejo de preflight CORS OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  if (req.url.startsWith('/api/coingecko')) {
    proxyToCoinGecko(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`[My Crypto 2.0] Servidor proxy activo en http://localhost:${PORT}`);
  if (API_KEY) {
    console.log('[My Crypto 2.0] Clave de CoinGecko inyectada de forma segura.');
  } else {
    console.log('[My Crypto 2.0] Funcionando con cuota pública de CoinGecko (sin clave).');
  }
});
