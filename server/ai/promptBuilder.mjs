// Constructor de prompts y contexto seguro para el AI Crypto Analyst de My Crypto 2.0
// Centraliza las directrices del sistema y el formateo riguroso de métricas de mercado

export const SYSTEM_INSTRUCTION = `Eres el AI Crypto Analyst de "My Crypto 2.0", una terminal de investigación de criptomonedas para inversores particulares.

Tu misión es ayudar a comprender los datos reales de mercado, explicar métricas técnicas y contextualizar la evolución de los activos de forma objetiva, pedagógica y prudente.

REGLAS OBLIGATORIAS:
1. BASADO EN DATOS: Utiliza estrictamente los datos verificados de mercado proporcionados en el contexto (cotizaciones en EUR, variaciones, volúmenes, capitalizaciones y resúmenes). No inventes precios, porcentajes, fechas, noticias, catalizadores ni fuentes.
2. DISTINCIÓN EPISTÉMICA: Diferencia claramente entre:
   - [Hecho observado]: Cifras exactas presentes en los datos (ej: "Bitcoin cotiza a 84.200 € con un alza del +3,2% en 24h").
   - [Interpretación técnica]: Análisis de la métrica (ej: "Un volumen elevado junto con una subida sugiere convicción compradora a corto plazo").
   - [Incertidumbre / Datos no disponibles]: Reconoce abiertamente lo que no puedes comprobar (ej: "La terminal no dispone de información sobre noticias recientes o eventos externos que expliquen este movimiento").
3. NO ASESORAMIENTO FINANCIERO: Nunca emitas recomendaciones personalizadas de compra, venta o retención. No prometas rentabilidad ni presentes predicciones como certezas. No des consejos fiscales.
4. CONSULTAS DE EDUCACIÓN FINANCIERA GENERAL (ej. "¿Dónde invierto?", "¿Cómo me hago rico?"):
   - Responde con tono pedagógico, prudente y constructivo; no rechaces la pregunta tajantemente.
   - Aclara con firmeza y transparencia que ninguna inversión garantiza hacerse rico ni obtener beneficios sin riesgo.
   - Enseña el principio fundamental: a mayor expectativa de rentabilidad, mayor es el riesgo de pérdida total o parcial del capital.
   - Orienta al usuario sobre la importancia de definir su horizonte temporal, su tolerancia al riesgo y volatilidad, su situación financiera (fondo de emergencia previo) y su nivel de experiencia antes de considerar cualquier asignación en criptomonedas.
   - No presentes una respuesta educativa genérica como si fuera un plan financiero individualizado.
5. LÍMITES DE INFORMACIÓN: Si el usuario pregunta por un activo o periodo cuyos datos no están en el contexto, indícalo con transparencia y explica qué datos sí tienes disponibles en la terminal.
6. RESPETO DE PRIVACIDAD: Nunca solicites claves privadas, frases semilla ni credenciales. Si el usuario incluye un resumen de cartera, analízalo descriptivamente (diversificación, pesos relativos) sin juzgar decisiones personales ni exponer datos sensibles.
7. IDIOMA Y TONO: Responde en español cuando el usuario escriba en español (o en el idioma de la consulta), con tono profesional, sobrio, claro y accesible, manteniendo la identidad técnica de terminal financiera.`;

/**
 * Formatea el contexto de mercado en texto estructurado verificable para el modelo.
 * Solo incluye campos reales y existentes; nunca inventa valores ausentes.
 */
export function buildMarketContextString(context = {}) {
  const sections = [];

  // 1. Activo individual o activo principal seleccionado
  if (context.asset) {
    const a = context.asset;
    const lines = [
      `=== ACTIVO SELECCIONADO: ${a.name} (${String(a.symbol).toUpperCase()}) ===`,
      `- Identificador estable: ${a.id}`,
      `- Precio actual: ${a.current_price !== undefined ? `${a.current_price} ${a.currency || 'EUR'}` : 'No disponible'}`,
      `- Variación 24h: ${a.price_change_percentage_24h !== undefined ? `${a.price_change_percentage_24h}%` : 'No disponible'}`,
      `- Rango 24h: Mínimo ${a.low_24h ?? 'N/D'} | Máximo ${a.high_24h ?? 'N/D'}`,
      `- Capitalización de mercado: ${a.market_cap ? `${a.market_cap} ${a.currency || 'EUR'} (Puesto #${a.market_cap_rank ?? 'N/D'})` : 'No disponible'}`,
      `- Volumen negociado 24h: ${a.total_volume ? `${a.total_volume} ${a.currency || 'EUR'}` : 'No disponible'}`,
      `- Última actualización de datos: ${a.last_updated || 'Fecha no registrada'}`,
      `- Fuente de cotización: ${a.source || 'CoinGecko v3'}`,
    ];

    if (a.historical_summary) {
      lines.push(`- Rendimiento histórico en el periodo consultado (${a.historical_summary.days} días):`);
      lines.push(`  * Precio inicial: ${a.historical_summary.startPrice ?? 'N/D'}`);
      lines.push(`  * Precio final: ${a.historical_summary.endPrice ?? 'N/D'}`);
      lines.push(`  * Variación absoluta: ${a.historical_summary.absoluteChange ?? 'N/D'}`);
      lines.push(`  * Variación porcentual: ${a.historical_summary.percentageChange !== undefined ? `${a.historical_summary.percentageChange}%` : 'N/D'}`);
    }

    sections.push(lines.join('\n'));
  }

  // 2. Lista de activos para comparación o contexto general
  if (Array.isArray(context.compareAssets) && context.compareAssets.length > 0) {
    const lines = ['=== ACTIVOS PARA COMPARACIÓN DE MERCADO ==='];
    for (const c of context.compareAssets) {
      lines.push(
        `- ${c.name} (${String(c.symbol).toUpperCase()}): Precio ${c.current_price ?? 'N/D'} EUR | Var 24h: ${c.price_change_percentage_24h ?? 'N/D'}% | Cap: ${c.market_cap ?? 'N/D'} EUR | Vol 24h: ${c.total_volume ?? 'N/D'} EUR`
      );
    }
    sections.push(lines.join('\n'));
  }

  // 3. Resumen global macroeconómico del mercado cripto
  if (context.global) {
    const g = context.global;
    const lines = [
      '=== RESUMEN GLOBAL DEL MERCADO (CoinGecko /global) ===',
      `- Capitalización global total: ${g.total_market_cap_eur ? `${g.total_market_cap_eur} EUR` : 'N/D'}`,
      `- Volumen global 24h: ${g.total_volume_eur ? `${g.total_volume_eur} EUR` : 'N/D'}`,
      `- Dominancia de Bitcoin: ${g.btc_dominance !== undefined ? `${g.btc_dominance}%` : 'N/D'}`,
      `- Variación 24h de la capitalización global: ${g.market_cap_change_percentage_24h !== undefined ? `${g.market_cap_change_percentage_24h}%` : 'N/D'}`,
    ];
    sections.push(lines.join('\n'));
  }

  // 4. Resumen anónimo de cartera (SOLO si el usuario lo activó explícitamente)
  if (context.portfolio) {
    const p = context.portfolio;
    const lines = [
      '=== RESUMEN AGREGADO DE CARTERA (Activado expresamente por el usuario) ===',
      `- Valoración actual total: ${p.totalCurrentValue ?? 'N/D'} EUR`,
      `- Base de coste total registrado: ${p.totalCostBasis ?? 'N/D'} EUR`,
      `- Beneficio latente no realizado: ${p.totalUnrealizedPnl ?? 'N/D'} EUR (${p.totalUnrealizedPnlPercentage ?? 'N/D'}%)`,
      `- Beneficio cerrado realizado: ${p.totalRealizedPnl ?? 'N/D'} EUR`,
      `- Número de posiciones activas: ${p.positionCount ?? 'N/D'}`,
    ];

    if (Array.isArray(p.distribution) && p.distribution.length > 0) {
      lines.push('- Distribución de activos por peso:');
      for (const d of p.distribution) {
        lines.push(`  * ${d.name} (${String(d.symbol).toUpperCase()}): ${d.percentage ?? 'N/D'}% del valor`);
      }
    }
    sections.push(lines.join('\n'));
  }

  if (sections.length === 0) {
    return 'No hay datos específicos de cotizaciones adjuntos para esta consulta. Responde basándote en conceptos generales sobre criptomonedas y advierte si se requiere información de mercado en tiempo real.';
  }

  return sections.join('\n\n');
}

/**
 * Empaqueta la instrucción del sistema, el contexto enriquecido y la estructura de contenidos para Gemini.
 */
export function buildAnalystPrompt({ prompt = '', context = {}, history = [] } = {}) {
  const marketContextText = buildMarketContextString(context);
  const userContent = [
    `[CONTEXTO DE DATOS DE MERCADO VERIFICADOS]:\n${marketContextText}\n`,
    `[CONSULTA DEL USUARIO]:\n${String(prompt).trim()}`,
  ].join('\n');

  const contents = [];
  for (const msg of history) {
    if (!msg || !msg.text) continue;
    const role = msg.role === 'user' ? 'user' : 'model';
    contents.push({
      role,
      parts: [{ text: String(msg.text).slice(0, 1500) }],
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: userContent }],
  });

  return {
    systemInstruction: SYSTEM_INSTRUCTION,
    marketContextText,
    contents,
  };
}

