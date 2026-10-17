import { describe, it, expect } from "vitest";
import {
  calculatePortfolioPositions,
  calculatePortfolioSummary,
  calculatePortfolioDistribution,
  validateTransaction,
  InsufficientBalanceError,
} from "./portfolioCalculations.ts";
import type { Transaction } from "../types/crypto";

describe("portfolioCalculations — Motor de Cartera y Método FIFO", () => {
  // 1. Compra inicial de un activo
  it("1. debe calcular correctamente la compra inicial de un activo", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "bitcoin",
        type: "buy",
        amount: 2,
        pricePerUnit: 50000,
        fee: 10,
        timestamp: 1000,
        createdAt: 1000,
      },
    ];

    const currentPrices = { bitcoin: 60000 };
    const positions = calculatePortfolioPositions(transactions, currentPrices);

    expect(positions).toHaveLength(1);
    expect(positions[0].coinId).toBe("bitcoin");
    expect(positions[0].amount).toBe(2);
    // Coste total = (2 * 50000) + 10 = 100010
    expect(positions[0].totalCostBasis).toBe(100010);
    expect(positions[0].averageBuyPrice).toBe(50005);
    // Valor actual = 2 * 60000 = 120000
    expect(positions[0].currentValue).toBe(120000);
    // P&L no realizado = 120000 - 100010 = 19990
    expect(positions[0].unrealizedPnl).toBe(19990);
    expect(positions[0].realizedPnl).toBe(0);
    expect(positions[0].totalFees).toBe(10);
  });

  // 2. Compras sucesivas a diferentes precios
  it("2. debe acumular compras sucesivas a diferentes precios con lotes FIFO", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "ethereum",
        type: "buy",
        amount: 1,
        pricePerUnit: 2000,
        fee: 5,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: "tx-2",
        coinId: "ethereum",
        type: "buy",
        amount: 2,
        pricePerUnit: 2500,
        fee: 10,
        timestamp: 2000,
        createdAt: 2000,
      },
    ];

    const currentPrices = { ethereum: 3000 };
    const positions = calculatePortfolioPositions(transactions, currentPrices);

    expect(positions).toHaveLength(1);
    expect(positions[0].amount).toBe(3);
    // Coste lote 1: 2000 + 5 = 2005
    // Coste lote 2: (2 * 2500) + 10 = 5010
    // Total coste restante = 7015
    expect(positions[0].totalCostBasis).toBe(7015);
    expect(positions[0].averageBuyPrice).toBeCloseTo(7015 / 3, 2);
    expect(positions[0].currentValue).toBe(9000);
    expect(positions[0].unrealizedPnl).toBe(9000 - 7015);
  });

  // 3. Venta parcial con método FIFO
  it("3. debe procesar una venta parcial consumiendo el lote más antiguo (FIFO) y computar P&L realizado", () => {
    // Lote 1: 1 BTC a 30.000€ (coste = 30000)
    // Lote 2: 1 BTC a 40.000€ (coste = 40000)
    // Venta: 0.5 BTC a 50.000€ (sin comisión)
    // Debe consumir 0.5 del Lote 1. Coste consumido = 15000.
    // Ingresos venta = 0.5 * 50000 = 25000. P&L realizado = 25000 - 15000 = 10000.
    // Lote 1 restante: 0.5 BTC (coste 15000). Lote 2 restante: 1 BTC (coste 40000).
    // Coste restante = 55000. Saldo restante = 1.5 BTC.
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "bitcoin",
        type: "buy",
        amount: 1,
        pricePerUnit: 30000,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: "tx-2",
        coinId: "bitcoin",
        type: "buy",
        amount: 1,
        pricePerUnit: 40000,
        fee: 0,
        timestamp: 2000,
        createdAt: 2000,
      },
      {
        id: "tx-3",
        coinId: "bitcoin",
        type: "sell",
        amount: 0.5,
        pricePerUnit: 50000,
        fee: 0,
        timestamp: 3000,
        createdAt: 3000,
      },
    ];

    const positions = calculatePortfolioPositions(transactions, { bitcoin: 50000 });

    expect(positions[0].amount).toBe(1.5);
    expect(positions[0].realizedPnl).toBe(10000);
    expect(positions[0].totalCostBasis).toBe(55000);
    expect(positions[0].currentValue).toBe(75000);
    expect(positions[0].unrealizedPnl).toBe(75000 - 55000);
  });

  // 4. Venta total que liquida una posición
  it("4. debe procesar una venta total liquidando la posición a saldo 0 y registrando el P&L realizado", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "solana",
        type: "buy",
        amount: 10,
        pricePerUnit: 100,
        fee: 5,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: "tx-2",
        coinId: "solana",
        type: "sell",
        amount: 10,
        pricePerUnit: 150,
        fee: 10,
        timestamp: 2000,
        createdAt: 2000,
      },
    ];

    // Coste de compra: 10 * 100 + 5 = 1005€
    // Ingresos de venta: 10 * 150 = 1500€
    // P&L realizado: 1500 - 1005 - 10 (comisión de venta) = 485€
    const positions = calculatePortfolioPositions(transactions, { solana: 160 });

    expect(positions[0].amount).toBe(0);
    expect(positions[0].totalCostBasis).toBe(0);
    expect(positions[0].currentValue).toBe(0);
    expect(positions[0].realizedPnl).toBe(485);
    expect(positions[0].totalFees).toBe(15);
    expect(positions[0].unrealizedPnl).toBe(0);
  });

  // 5. Venta inválida por superar la posición disponible (anti-short)
  it("5. debe lanzar InsufficientBalanceError si una venta supera el saldo disponible", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "bitcoin",
        type: "buy",
        amount: 1,
        pricePerUnit: 50000,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: "tx-2",
        coinId: "bitcoin",
        type: "sell",
        amount: 1.5,
        pricePerUnit: 60000,
        fee: 0,
        timestamp: 2000,
        createdAt: 2000,
      },
    ];

    expect(() => calculatePortfolioPositions(transactions, {})).toThrowError(
      InsufficientBalanceError,
    );
  });

  // 6. Tratamiento de comisiones en compra y venta
  it("6. debe imputar comisiones de compra al coste y comisiones de venta reduciendo el beneficio", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "cardano",
        type: "buy",
        amount: 1000,
        pricePerUnit: 0.5,
        fee: 10, // Compra: 500€ + 10€ fee = 510€ de base
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: "tx-2",
        coinId: "cardano",
        type: "sell",
        amount: 500,
        pricePerUnit: 0.8,
        fee: 5, // Venta: 400€ - 255€ coste consumido - 5€ fee = 140€ realizado
        timestamp: 2000,
        createdAt: 2000,
      },
    ];

    const positions = calculatePortfolioPositions(transactions, { cardano: 1 });

    expect(positions[0].amount).toBe(500);
    expect(positions[0].totalCostBasis).toBe(255);
    expect(positions[0].realizedPnl).toBe(140);
    expect(positions[0].totalFees).toBe(15);
  });

  // 7. Cálculo del coste restante tras venta parcial de múltiples lotes
  it("7. debe calcular con precisión el coste restante al agotar el primer lote y parte del segundo", () => {
    // Lote 1: 2 BTC a 20.000€ = 40.000€
    // Lote 2: 3 BTC a 30.000€ = 90.000€
    // Total disponible: 5 BTC por 130.000€
    // Venta: 3 BTC a 40.000€
    // FIFO consume:
    //   - 2 BTC de Lote 1 (coste 40.000€)
    //   - 1 BTC de Lote 2 (coste 30.000€)
    // Coste consumido total = 70.000€
    // Restante: 2 BTC del Lote 2. Coste restante = 60.000€
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "bitcoin",
        type: "buy",
        amount: 2,
        pricePerUnit: 20000,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: "tx-2",
        coinId: "bitcoin",
        type: "buy",
        amount: 3,
        pricePerUnit: 30000,
        fee: 0,
        timestamp: 2000,
        createdAt: 2000,
      },
      {
        id: "tx-3",
        coinId: "bitcoin",
        type: "sell",
        amount: 3,
        pricePerUnit: 40000,
        fee: 0,
        timestamp: 3000,
        createdAt: 3000,
      },
    ];

    const positions = calculatePortfolioPositions(transactions, { bitcoin: 40000 });

    expect(positions[0].amount).toBe(2);
    expect(positions[0].totalCostBasis).toBe(60000);
    expect(positions[0].averageBuyPrice).toBe(30000);
    // Realizado = 3 * 40.000 - 70.000 = 50.000€
    expect(positions[0].realizedPnl).toBe(50000);
  });

  // 8 y 9. Separación de P&L realizado y no realizado
  it("8-9. debe separar rigurosamente el P&L realizado del P&L no realizado", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "bitcoin",
        type: "buy",
        amount: 1,
        pricePerUnit: 40000,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: "tx-2",
        coinId: "bitcoin",
        type: "sell",
        amount: 0.5,
        pricePerUnit: 50000, // Venta a 50k -> beneficio realizado de +5.000€
        fee: 0,
        timestamp: 2000,
        createdAt: 2000,
      },
    ];

    // Ahora el precio de mercado actual baja a 30.000€
    // Restante: 0.5 BTC con coste de 20.000€
    // Valor actual: 0.5 * 30.000 = 15.000€
    // P&L no realizado: 15.000 - 20.000 = -5.000€ (pérdida latente)
    // P&L realizado: +5.000€ (ganancia consolidada previa)
    const positions = calculatePortfolioPositions(transactions, { bitcoin: 30000 });

    expect(positions[0].realizedPnl).toBe(5000);
    expect(positions[0].unrealizedPnl).toBe(-5000);
    expect(positions[0].currentValue).toBe(15000);
  });

  // 10. Operaciones con fechas diferentes desordenadas
  it("10. debe ordenar cronológicamente las transacciones antes de procesar lotes FIFO", () => {
    const transactionsOutOfOrder: Transaction[] = [
      {
        id: "tx-3",
        coinId: "ethereum",
        type: "sell",
        amount: 1,
        pricePerUnit: 3000,
        fee: 0,
        timestamp: 3000,
        createdAt: 3000,
      },
      {
        id: "tx-1",
        coinId: "ethereum",
        type: "buy",
        amount: 1,
        pricePerUnit: 1000,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: "tx-2",
        coinId: "ethereum",
        type: "buy",
        amount: 1,
        pricePerUnit: 2000,
        fee: 0,
        timestamp: 2000,
        createdAt: 2000,
      },
    ];

    // Si no se ordenara cronológicamente, fallaría diciendo saldo insuficiente en tx-3.
    // Con orden cronológico: tx-1 (1000€) -> tx-2 (2000€) -> tx-3 vende 1 ETH (FIFO toma tx-1 a 1000€).
    // Realizado = 3000 - 1000 = 2000€. Restante = 1 ETH del tx-2 (coste 2000€).
    const positions = calculatePortfolioPositions(transactionsOutOfOrder, { ethereum: 3000 });

    expect(positions[0].amount).toBe(1);
    expect(positions[0].realizedPnl).toBe(2000);
    expect(positions[0].totalCostBasis).toBe(2000);
  });

  // 11. Precisión decimal elevada (fracciones de Bitcoin)
  it("11. debe calcular con alta precisión transacciones con decimales pequeños", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "bitcoin",
        type: "buy",
        amount: 0.0025,
        pricePerUnit: 64532.78,
        fee: 1.25,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: "tx-2",
        coinId: "bitcoin",
        type: "sell",
        amount: 0.001,
        pricePerUnit: 70123.45,
        fee: 0.5,
        timestamp: 2000,
        createdAt: 2000,
      },
    ];

    const positions = calculatePortfolioPositions(transactions, { bitcoin: 71000 });

    expect(positions[0].amount).toBeCloseTo(0.0015, 6);
    expect(positions[0].realizedPnl).toBeGreaterThan(0);
    expect(positions[0].totalCostBasis).toBeGreaterThan(0);
  });

  // 12. Precio actual de mercado no disponible
  it("12. no debe reemplazar cotizaciones faltantes con cero y debe marcar como no disponible", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "rare-token",
        type: "buy",
        amount: 100,
        pricePerUnit: 2.5,
        fee: 1,
        timestamp: 1000,
        createdAt: 1000,
      },
    ];

    // Precio no disponible en el feed actual de mercado
    const positions = calculatePortfolioPositions(transactions, { "rare-token": null });

    expect(positions[0].amount).toBe(100);
    expect(positions[0].currentPrice).toBeNull();
    expect(positions[0].currentValue).toBeNull();
    expect(positions[0].unrealizedPnl).toBeNull();
    expect(positions[0].unrealizedPnlPercentage).toBeNull();
    expect(positions[0].totalCostBasis).toBe(251);

    const summary = calculatePortfolioSummary(positions, 1);
    expect(summary.hasUnavailablePrices).toBe(true);
  });

  // 13. Historial vacío
  it("13. debe manejar un historial vacío retornando posiciones vacías y resumen a cero", () => {
    const positions = calculatePortfolioPositions([], {});
    expect(positions).toEqual([]);

    const summary = calculatePortfolioSummary(positions, 0);
    expect(summary.totalCurrentValue).toBe(0);
    expect(summary.totalCostBasis).toBe(0);
    expect(summary.totalRealizedPnl).toBe(0);
    expect(summary.totalUnrealizedPnl).toBe(0);
    expect(summary.positionCount).toBe(0);
    expect(summary.hasUnavailablePrices).toBe(false);
  });

  // 14. Inmutabilidad de los datos de entrada
  it("14. no debe mutar los objetos de transacciones originales durante el cómputo", () => {
    const original: ReadonlyArray<Transaction> = Object.freeze([
      Object.freeze({
        id: "tx-1",
        coinId: "bitcoin",
        type: "buy",
        amount: 1,
        pricePerUnit: 50000,
        fee: 0,
        timestamp: 2000,
        createdAt: 2000,
      }),
      Object.freeze({
        id: "tx-2",
        coinId: "bitcoin",
        type: "buy",
        amount: 1,
        pricePerUnit: 60000,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      }),
    ]);

    expect(() => calculatePortfolioPositions(original, { bitcoin: 55000 })).not.toThrow();
  });

  // 15. Validación de transacciones inválidas
  it("15. debe validar campos obligatorios y montos inválidos", () => {
    expect(validateTransaction({ coinId: "", type: "buy", amount: 1, pricePerUnit: 10, fee: 0, timestamp: 100 }).isValid).toBe(false);
    expect(validateTransaction({ coinId: "btc", type: "buy", amount: -1, pricePerUnit: 10, fee: 0, timestamp: 100 }).isValid).toBe(false);
    expect(validateTransaction({ coinId: "btc", type: "buy", amount: 1, pricePerUnit: -10, fee: 0, timestamp: 100 }).isValid).toBe(false);
    expect(validateTransaction({ coinId: "btc", type: "buy", amount: 1, pricePerUnit: 10, fee: -5, timestamp: 100 }).isValid).toBe(false);
    expect(validateTransaction({ coinId: "btc", type: "buy", amount: 1, pricePerUnit: 10, fee: 0, timestamp: 0 }).isValid).toBe(false);
    expect(validateTransaction({ coinId: "btc", type: "sell", amount: 5, pricePerUnit: 10, fee: 0, timestamp: 100 }, 2).isValid).toBe(false);
    expect(validateTransaction({ coinId: "btc", type: "buy", amount: 1, pricePerUnit: 10, fee: 0, timestamp: 100 }, 0).isValid).toBe(true);
  });

  // 16. Múltiples activos y distribución porcentual
  it("16. debe calcular correctamente la ponderación y distribución de la cartera por activo", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        coinId: "bitcoin",
        type: "buy",
        amount: 1,
        pricePerUnit: 50000,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: "tx-2",
        coinId: "ethereum",
        type: "buy",
        amount: 10,
        pricePerUnit: 2500,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      },
    ];

    const currentPrices = {
      bitcoin: 60000, // 1 * 60000 = 60000 (60%)
      ethereum: 4000,  // 10 * 4000 = 40000 (40%)
    };

    const positions = calculatePortfolioPositions(transactions, currentPrices);
    const summary = calculatePortfolioSummary(positions, 2);
    const distribution = calculatePortfolioDistribution(positions);

    expect(summary.totalCurrentValue).toBe(100000);
    const btcPos = positions.find((p) => p.coinId === "bitcoin");
    const ethPos = positions.find((p) => p.coinId === "ethereum");

    expect(btcPos?.allocationPercentage).toBeCloseTo(60, 1);
    expect(ethPos?.allocationPercentage).toBeCloseTo(40, 1);

    expect(distribution).toHaveLength(2);
    expect(distribution[0].coinId).toBe("bitcoin");
    expect(distribution[0].percentage).toBeCloseTo(60, 1);
  });

  // 17. Recompra posterior tras liquidación total
  it("17. debe permitir recomprar un activo tras una liquidación previa reiniciando la base de coste", () => {
    const transactions: Transaction[] = [
      { id: "1", coinId: "btc", type: "buy", amount: 1, pricePerUnit: 10000, fee: 0, timestamp: 1000, createdAt: 1000 },
      { id: "2", coinId: "btc", type: "sell", amount: 1, pricePerUnit: 20000, fee: 0, timestamp: 2000, createdAt: 2000 },
      { id: "3", coinId: "btc", type: "buy", amount: 0.5, pricePerUnit: 30000, fee: 0, timestamp: 3000, createdAt: 3000 },
    ];

    const positions = calculatePortfolioPositions(transactions, { btc: 40000 });
    expect(positions[0].amount).toBe(0.5);
    expect(positions[0].totalCostBasis).toBe(15000);
    expect(positions[0].averageBuyPrice).toBe(30000);
    expect(positions[0].realizedPnl).toBe(10000); // 20k - 10k de la primera venta
    expect(positions[0].unrealizedPnl).toBe(20000 - 15000); // 0.5 * 40k = 20k, menos 15k
  });

  // 18. Tolerancia a micro residuos numéricos (Epsilon)
  it("18. debe redondear residuos menores a FINANCIAL_EPSILON a cero exacto", () => {
    const transactions: Transaction[] = [
      { id: "1", coinId: "btc", type: "buy", amount: 0.1 + 0.2, pricePerUnit: 10000, fee: 0, timestamp: 1000, createdAt: 1000 },
      { id: "2", coinId: "btc", type: "sell", amount: 0.3, pricePerUnit: 10000, fee: 0, timestamp: 2000, createdAt: 2000 },
    ];

    const positions = calculatePortfolioPositions(transactions, { btc: 10000 });
    expect(positions[0].amount).toBe(0);
    expect(positions[0].totalCostBasis).toBe(0);
  });
});
