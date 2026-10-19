// Adaptador y proxy seguro para CoinGecko v3
// Inyecta la cabecera x-cg-demo-api-key en el servidor y previene bloqueos por CORS

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Reenvía peticiones a CoinGecko de forma segura sin exponer claves al navegador
export async function handleCoinGeckoProxy(req, res) {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // CoinGecko solo admite consultas de lectura
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    });
    res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Solo se permiten solicitudes GET.' }));
    return;
  }

  try {
    const rawUrl = req.url || '';
    const parsedUrl = new URL(rawUrl, 'http://localhost');

    // Extrae la ruta eliminando el prefijo del proxy
    let targetPath = parsedUrl.pathname.replace(/^\/api\/coingecko/, '');

    // Soporte para parámetros de ruta de Vercel [...path]
    if ((!targetPath || targetPath === '/') && req.query && req.query.path) {
      const subpath = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
      targetPath = `/${subpath}`;
    }

    if (!targetPath.startsWith('/')) {
      targetPath = `/${targetPath}`;
    }

    // Filtra el parámetro interno 'path' inyectado por Vercel para no ensuciar la consulta a CoinGecko
    const searchParams = new URLSearchParams(parsedUrl.search);
    searchParams.delete('path');
    const queryString = searchParams.toString();

    const destinationUrl = `${COINGECKO_BASE_URL}${targetPath}${queryString ? `?${queryString}` : ''}`;

    const apiKey = (process.env.COINGECKO_API_KEY || '').trim();
    const headers = {
      Accept: 'application/json',
      'User-Agent': 'MyCrypto2.0-Terminal/1.0',
    };

    // Añade la clave si existe en las variables de entorno sin exponerla al cliente
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const upstreamRes = await fetch(destinationUrl, {
      method: req.method,
      headers,
    });

    const responseHeaders = {
      ...CORS_HEADERS,
      'Content-Type': upstreamRes.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': upstreamRes.headers.get('cache-control') || 'public, max-age=60',
    };

    const data = await upstreamRes.arrayBuffer();
    res.writeHead(upstreamRes.status, responseHeaders);
    res.end(Buffer.from(data));
  } catch (err) {
    res.writeHead(502, {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    });
    res.end(
      JSON.stringify({
        error: 'UPSTREAM_ERROR',
        message: 'Error al conectar con CoinGecko mediante proxy.',
        details: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
