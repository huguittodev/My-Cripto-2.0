// Función Serverless para Vercel: /api/coingecko/*
// Redirige consultas de mercado a CoinGecko inyectando la clave de API segura
import { handleCoinGeckoProxy } from '../../server/coingeckoProxy.mjs';

export default async function handler(req, res) {
  return handleCoinGeckoProxy(req, res);
}
