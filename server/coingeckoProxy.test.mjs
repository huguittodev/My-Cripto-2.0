// Pruebas unitarias para el proxy seguro de CoinGecko
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleCoinGeckoProxy } from './coingeckoProxy.mjs';

describe('CoinGecko Proxy (Serverless / Server Logic)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Mock auxiliar para emular objetos req y res de Node.js
  function createMockHttp(options = {}) {
    const req = {
      method: options.method || 'GET',
      url: options.url || '/api/coingecko/global',
      query: options.query || {},
      headers: options.headers || {},
    };

    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      writeHead: vi.fn((statusCode, headers) => {
        res.statusCode = statusCode;
        res.headers = { ...res.headers, ...headers };
        return res;
      }),
      end: vi.fn((data) => {
        if (data) {
          res.body = Buffer.isBuffer(data) ? data.toString('utf-8') : String(data);
        }
        return res;
      }),
    };

    return { req, res };
  }

  it('responde 204 con cabeceras CORS en solicitudes OPTIONS (preflight)', async () => {
    const { req, res } = createMockHttp({ method: 'OPTIONS' });
    await handleCoinGeckoProxy(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(204, expect.objectContaining({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    }));
    expect(res.end).toHaveBeenCalled();
  });

  it('rechaza métodos HTTP no permitidos como POST con código 405', async () => {
    const { req, res } = createMockHttp({ method: 'POST' });
    await handleCoinGeckoProxy(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(405, expect.any(Object));
    const parsed = JSON.parse(res.body);
    expect(parsed.error).toBe('METHOD_NOT_ALLOWED');
  });

  it('reenvía /api/coingecko/global a la URL canónica de CoinGecko inyectando la clave si existe', async () => {
    process.env.COINGECKO_API_KEY = 'TEST_CG_KEY_SECRET_123';

    const mockResponseData = JSON.stringify({ data: { active_cryptocurrencies: 15000 } });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
      arrayBuffer: () => Promise.resolve(Buffer.from(mockResponseData)),
    });

    const { req, res } = createMockHttp({
      url: '/api/coingecko/global',
    });

    await handleCoinGeckoProxy(req, res);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/global',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-cg-demo-api-key': 'TEST_CG_KEY_SECRET_123',
        }),
      })
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ data: { active_cryptocurrencies: 15000 } });
    // Asegura que la clave nunca se fuga en la respuesta
    expect(res.body).not.toContain('TEST_CG_KEY_SECRET_123');
  });

  it('preserva parámetros de búsqueda (query string) y los reenvía correctamente', async () => {
    process.env.COINGECKO_API_KEY = '';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      arrayBuffer: () => Promise.resolve(Buffer.from('[]')),
    });

    const { req, res } = createMockHttp({
      url: '/api/coingecko/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=25',
    });

    await handleCoinGeckoProxy(req, res);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=25',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'x-cg-demo-api-key': expect.anything(),
        }),
      })
    );
    expect(res.statusCode).toBe(200);
  });

  it('maneja subrutas dinámicas inyectadas por Vercel [...path]', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      arrayBuffer: () => Promise.resolve(Buffer.from('{}')),
    });

    const { req, res } = createMockHttp({
      url: '/api/coingecko?path=coins&path=markets&vs_currency=usd',
      query: { path: ['coins', 'markets'], vs_currency: 'usd' },
    });

    await handleCoinGeckoProxy(req, res);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd',
      expect.any(Object)
    );
  });

  it('captura fallos de red hacia CoinGecko y devuelve 502 controlado con CORS', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection timed out to CoinGecko'));

    const { req, res } = createMockHttp({
      url: '/api/coingecko/global',
    });

    await handleCoinGeckoProxy(req, res);

    expect(res.statusCode).toBe(502);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    const parsed = JSON.parse(res.body);
    expect(parsed.error).toBe('UPSTREAM_ERROR');
    expect(parsed.message).toContain('Error al conectar');
  });
});
