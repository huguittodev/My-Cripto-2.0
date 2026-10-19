// Función Serverless para Vercel: /api/coingecko
// Atiende todas las peticiones a CoinGecko v3 reescritas desde /api/coingecko/:path*
import { handleCoinGeckoProxy } from '../server/coingeckoProxy.mjs';

export default async function handler(req, res) {
  return handleCoinGeckoProxy(req, res);
}
