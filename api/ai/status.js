// Función Serverless para Vercel: GET /api/ai/status
// Informa sobre el estado de configuración de Gemini de forma segura
import { handleStatusRequest } from '../../server/ai/aiRoutes.mjs';

export default function handler(req, res) {
  return handleStatusRequest(req, res);
}
