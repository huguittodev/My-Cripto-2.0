// Generador determinista para Modo Degradado en My Crypto 2.0
// Proporciona información financiera objetiva y datos verificados cuando la IA no está disponible
// NUNCA simula ser una respuesta generada por IA ni inventa datos de mercado

/**
 * Genera una respuesta determinista rigurosa a partir de los datos verificados existentes en la terminal.
 * 
 * @param {object} params
 * @param {string} params.prompt - Consulta original formulada por el usuario
 * @param {object} [params.context={}] - Contexto de mercado (activo seleccionado, globales, cartera)
 * @param {string} [params.reason='Servicio no disponible'] - Motivo por el que se recurre al modo degradado
 * @returns {object} Respuesta formateada con bandera explícita isDegraded: true
 */
export function generateDegradedResponse({ prompt, context = {}, reason = 'Servicio temporalmente no disponible' }) {
  const parts = [];

  // Encabezado de transparencia obligatorio
  parts.push(
    `### ⚡ Modo Degradado — Datos Verificados de la Terminal\n\n` +
      `> ℹ️ **Aviso de disponibilidad:** El análisis avanzado por IA no se encuentra disponible temporalmente (${reason}). ` +
      `A continuación se presentan los datos verificados cargados en la terminal y las pautas objetivas de referencia.`
  );

  const lowerPrompt = prompt.toLowerCase();
  const isGeneralWealthOrAdviceQuestion =
    lowerPrompt.includes('rico') ||
    lowerPrompt.includes('donde invierto') ||
    lowerPrompt.includes('dónde invierto') ||
    lowerPrompt.includes('en qué invierto') ||
    lowerPrompt.includes('en que invierto') ||
    lowerPrompt.includes('consejo') ||
    lowerPrompt.includes('ganar dinero');

  // Si el usuario pregunta por enriquecimiento o asesoramiento de inversión general
  if (isGeneralWealthOrAdviceQuestion) {
    parts.push(
      `#### 📚 Principios Fundamentales de Educación Financiera\n\n` +
        `1. **Sin garantías de enriquecimiento:** Ninguna inversión, estrategia ni activo financiero garantiza rendimientos ni enriquecimiento. En los mercados financieros, rentabilidades esperadas más altas implican invariablemente mayores riesgos de pérdida patrimonial.\n` +
        `2. **Horizonte temporal y perfil de riesgo:** Antes de realizar cualquier asignación, es imprescindible definir tu horizonte (meses, años) y tu tolerancia a la volatilidad extrema, especialmente en el ecosistema cripto.\n` +
        `3. **Salud financiera previa:** Se recomienda contar con un fondo de emergencia para imprevistos en divisa líquida antes de destinar capital a activos volátiles.\n` +
        `4. **Gestión del riesgo y diversificación:** Nunca inviertas dinero que no puedas permitirte perder por completo. La diversificación y la inversión periódica (DCA) mitigan el impacto de la volatilidad frente a apuestas concentradas.`
    );
  }

  // Si existe un activo fijado en la terminal, se exponen sus métricas reales
  if (context.asset) {
    const a = context.asset;
    parts.push(
      `#### 📊 Datos de Mercado Verificados: ${a.name} (${String(a.symbol).toUpperCase()})\n\n` +
        `- **Precio actual:** ${a.current_price !== undefined ? `${a.current_price} ${a.currency || 'EUR'}` : 'No disponible'}\n` +
        `- **Variación 24h:** ${a.price_change_percentage_24h !== undefined ? `${a.price_change_percentage_24h > 0 ? '+' : ''}${a.price_change_percentage_24h}%` : 'N/D'}\n` +
        `- **Rango 24h:** Mínimo ${a.low_24h ?? 'N/D'} | Máximo ${a.high_24h ?? 'N/D'}\n` +
        `- **Capitalización de mercado:** ${a.market_cap ? `${a.market_cap} EUR (Puesto #${a.market_cap_rank ?? 'N/D'})` : 'N/D'}\n` +
        `- **Volumen 24h:** ${a.total_volume ? `${a.total_volume} EUR` : 'N/D'}\n` +
        `- **Fuente:** ${a.source || 'CoinGecko v3'}`
    );
  }

  // Resumen global si está presente
  if (context.global) {
    const g = context.global;
    parts.push(
      `#### 🌐 Panorama Global Cripto (CoinGecko)\n\n` +
        `- **Capitalización global:** ${g.total_market_cap_eur ? `${g.total_market_cap_eur} EUR` : 'N/D'}\n` +
        `- **Dominancia de Bitcoin:** ${g.btc_dominance !== undefined ? `${g.btc_dominance}%` : 'N/D'}\n` +
        `- **Volumen 24h global:** ${g.total_volume_eur ? `${g.total_volume_eur} EUR` : 'N/D'}`
    );
  }

  // Resumen de cartera anónimo si fue habilitado por el usuario
  if (context.portfolio) {
    const p = context.portfolio;
    parts.push(
      `#### 💼 Resumen de Cartera Registrada\n\n` +
        `- **Valoración total actual:** ${p.totalCurrentValue ?? 'N/D'} EUR\n` +
        `- **P&L latente no realizado:** ${p.totalUnrealizedPnl ?? 'N/D'} EUR (${p.totalUnrealizedPnlPercentage ?? 'N/D'}%)\n` +
        `- **Posiciones activas:** ${p.positionCount ?? '0'}`
    );
  }

  // Cierre ético y de responsabilidad
  parts.push(
    `---\n*Nota legal: Esta información ha sido extraída de forma cuantitativa y determinista de las cotizaciones disponibles en tu sesión. No constituye asesoramiento financiero ni recomendación personalizada de inversión.*`
  );

  return {
    text: parts.join('\n\n'),
    model: 'deterministic-fallback',
    provider: 'fallback-deterministic',
    finishReason: 'FALLBACK_COMPLETED',
    isDegraded: true,
    isCached: false,
    timestamp: Date.now(),
  };
}
