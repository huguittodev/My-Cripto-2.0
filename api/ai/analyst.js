// Función Serverless para Vercel: POST /api/ai/analyst
// Procesa las consultas de inteligencia artificial interactuando con Gemini
import { handleAiRequest } from '../../server/ai/aiRoutes.mjs';

export default async function handler(req, res) {
  return handleAiRequest(req, res);
}
