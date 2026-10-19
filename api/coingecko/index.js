// Función Serverless para Vercel: /api/coingecko (raíz)
import { handleCoinGeckoProxy } from '../../server/coingeckoProxy.mjs';

export default async function handler(req, res) {
  return handleCoinGeckoProxy(req, res);
}
