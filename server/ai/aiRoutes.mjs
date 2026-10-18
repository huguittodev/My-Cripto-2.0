// Enrutador HTTP para endpoints de Inteligencia Artificial
// Utilizable tanto en Node.js proxy (producción) como en el middleware de Vite (desarrollo)

import { processAnalystQuery, getAnalystStatus } from './aiAnalystService.mjs';

const CORS_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Lee y parsea el cuerpo de una solicitud HTTP en streaming de Node.js.
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // Protección contra payloads maliciosos de gran tamaño (> 1 MB)
      if (raw.length > 1024 * 1024) {
        reject(new Error('Payload demasiado grande.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`JSON no válido: ${err.message}`));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Manejador para POST /api/ai/analyst
 */
export async function handleAiRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, CORS_HEADERS);
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED', message: 'Método no permitido. Utiliza POST.' }));
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = await processAnalystQuery(body);

    res.writeHead(200, CORS_HEADERS);
    res.end(JSON.stringify({ ok: true, data: result }));
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const errorCode = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'Error interno al procesar la consulta analítica.';

    res.writeHead(statusCode, CORS_HEADERS);
    res.end(
      JSON.stringify({
        ok: false,
        error: errorCode,
        message,
        details: err.details || undefined,
      })
    );
  }
}

/**
 * Manejador para GET /api/ai/status
 */
export function handleStatusRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  try {
    const status = getAnalystStatus();
    res.writeHead(200, CORS_HEADERS);
    res.end(JSON.stringify({ ok: true, data: status }));
  } catch (err) {
    res.writeHead(500, CORS_HEADERS);
    res.end(JSON.stringify({ ok: false, error: 'STATUS_ERROR', message: err.message }));
  }
}
