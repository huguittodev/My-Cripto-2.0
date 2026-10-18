import { describe, it, expect } from 'vitest';
import { buildAnalystPrompt, buildMarketContextString } from './promptBuilder.mjs';

describe('AI Analyst Prompt Builder (Server)', () => {
  it('genera un prompt con sistema e instrucciones estrictas de veracidad', () => {
    const { systemInstruction, contents } = buildAnalystPrompt({
      prompt: '¿Cómo está Bitcoin hoy?',
      context: {},
      history: [],
    });

    expect(systemInstruction).toContain('AI Crypto Analyst');
    expect(systemInstruction).toContain('REGLAS OBLIGATORIAS');
    expect(systemInstruction).toContain('No inventes precios');
    expect(systemInstruction).toContain('NO ASESORAMIENTO FINANCIERO');
    expect(contents.length).toBeGreaterThanOrEqual(1);
    expect(contents[contents.length - 1].parts[0].text).toContain('¿Cómo está Bitcoin hoy?');
  });

  it('incluye métricas precisas del activo seleccionado cuando están disponibles', () => {
    const assetContext = {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'btc',
      current_price: 85250.75,
      price_change_percentage_24h: 2.34,
      market_cap: 1680000000000,
      total_volume: 42000000000,
      high_24h: 86100,
      low_24h: 84000,
      last_updated: '2026-10-19T00:30:00.000Z',
      currency: 'EUR',
      source: 'CoinGecko API',
    };

    const { contents } = buildAnalystPrompt({
      prompt: 'Analiza este activo',
      context: { asset: assetContext },
      history: [],
    });

    const userText = contents[contents.length - 1].parts[0].text;
    expect(userText).toContain('Bitcoin (BTC)');
    expect(userText).toContain('85250.75 EUR');
    expect(userText).toContain('2.34%');
    expect(userText).toContain('CoinGecko API');
    expect(userText).toContain('2026-10-19T00:30:00.000Z');
  });

  it('no inventa datos cuando faltan campos en el activo', () => {
    const incompleteAsset = {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'eth',
      current_price: 3200,
      // market_cap, volume y rangos no definidos
    };

    const { contents } = buildAnalystPrompt({
      prompt: 'Resume Ethereum',
      context: { asset: incompleteAsset },
      history: [],
    });

    const userText = contents[contents.length - 1].parts[0].text;
    expect(userText).toContain('Ethereum (ETH)');
    expect(userText).toContain('3200');
    expect(userText).toContain('Capitalización de mercado: No disponible');
    expect(userText).toContain('Volumen negociado 24h: No disponible');
  });

  it('incorpora datos de comparativa entre activos cuando existen', () => {
    const { contents } = buildAnalystPrompt({
      prompt: 'Compara BTC y SOL',
      context: {
        compareAssets: [
          { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 85000, price_change_percentage_24h: 1.2 },
          { id: 'solana', name: 'Solana', symbol: 'sol', current_price: 180, price_change_percentage_24h: -3.4 },
        ],
      },
      history: [],
    });

    const userText = contents[contents.length - 1].parts[0].text;
    expect(userText).toContain('ACTIVOS PARA COMPARACIÓN DE MERCADO');
    expect(userText).toContain('Bitcoin (BTC): Precio 85000 EUR');
    expect(userText).toContain('Solana (SOL): Precio 180 EUR');
  });

  it('formatea resumen anónimo de cartera únicamente cuando el usuario lo adjunta expresamente', () => {
    const portfolioContext = {
      totalCurrentValue: 12500,
      totalCostBasis: 10000,
      totalUnrealizedPnl: 2500,
      totalUnrealizedPnlPercentage: 25.0,
      totalRealizedPnl: 450,
      positionCount: 2,
      distribution: [
        { name: 'Bitcoin', symbol: 'BTC', percentage: 70 },
        { name: 'Ethereum', symbol: 'ETH', percentage: 30 },
      ],
    };

    const { contents } = buildAnalystPrompt({
      prompt: '¿Cómo ves la diversificación de mi cartera?',
      context: { portfolio: portfolioContext },
      history: [],
    });

    const userText = contents[contents.length - 1].parts[0].text;
    expect(userText).toContain('RESUMEN AGREGADO DE CARTERA');
    expect(userText).toContain('Valoración actual total: 12500 EUR');
    expect(userText).toContain('Beneficio latente no realizado: 2500 EUR (25%)');
    expect(userText).toContain('Bitcoin (BTC): 70% del valor');
    expect(userText).toContain('Ethereum (ETH): 30% del valor');
    // Verifica que no se envíen transacciones privadas ni notas
    expect(userText).not.toContain('transactions');
  });

  it('no incluye ninguna sección de cartera si no fue enviada expresamente', () => {
    const { contents } = buildAnalystPrompt({
      prompt: '¿Cuál es el volumen global?',
      context: {},
      history: [],
    });

    const userText = contents[contents.length - 1].parts[0].text;
    expect(userText).not.toContain('RESUMEN AGREGADO DE CARTERA');
  });

  it('preserva el historial de conversación en el orden adecuado', () => {
    const history = [
      { role: 'user', text: '¿Qué es el Market Cap?' },
      { role: 'model', text: 'El Market Cap es el valor total de todas las monedas en circulación.' },
    ];

    const { contents } = buildAnalystPrompt({
      prompt: '¿Y el volumen?',
      context: {},
      history,
    });

    expect(contents.length).toBe(3);
    expect(contents[0].role).toBe('user');
    expect(contents[0].parts[0].text).toBe('¿Qué es el Market Cap?');
    expect(contents[1].role).toBe('model');
    expect(contents[1].parts[0].text).toContain('El Market Cap');
    expect(contents[2].role).toBe('user');
    expect(contents[2].parts[0].text).toContain('¿Y el volumen?');
  });

  it('buildMarketContextString devuelve mensaje de aviso cuando el contexto está vacío', () => {
    const str = buildMarketContextString({});
    expect(str).toContain('No hay datos específicos');
  });
});
