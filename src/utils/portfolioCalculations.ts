import type {
  Transaction,
  PortfolioPosition,
  PortfolioSummary,
} from "../types/crypto";

// Tolerancia para comparaciones en punto flotante con fracciones decimales pequeñas de criptomonedas
export const FINANCIAL_EPSILON = 1e-8;

export class InsufficientBalanceError extends Error {
  readonly coinId: string;
  readonly attemptedAmount: number;
  readonly availableAmount: number;

  constructor(coinId: string, attemptedAmount: number, availableAmount: number) {
    super(
      `Operación no válida: Se intentó vender ${attemptedAmount} de '${coinId}', pero el saldo disponible es de ${availableAmount}. No se permiten ventas en corto.`,
    );
    this.name = "InsufficientBalanceError";
    this.coinId = coinId;
    this.attemptedAmount = attemptedAmount;
    this.availableAmount = availableAmount;
  }
}

export class InvalidTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTransactionError";
  }
}

// Estructura interna de lote contable para el cálculo FIFO
interface ActiveLot {
  id: string;
  remainingAmount: number;
  remainingCostBasis: number; // Coste de adquisición pendiente que incluye comisiones proporcionales de compra
  pricePerUnit: number;
  timestamp: number;
}

/**
 * Valida formalmente los campos de una transacción antes de su procesamiento.
 * @param tx Objeto de transacción a validar
 * @param availableAmount Cantidad actualmente en cartera del activo (opcional para compras)
 */
export const validateTransaction = (
  tx: Partial<Transaction>,
  availableAmount = 0,
): { isValid: boolean; error?: string } => {
  if (!tx.coinId || typeof tx.coinId !== "string" || tx.coinId.trim() === "") {
    return { isValid: false, error: "El identificador del criptoactivo es obligatorio." };
  }

  if (tx.type !== "buy" && tx.type !== "sell") {
    return { isValid: false, error: "El tipo de operación debe ser 'buy' (compra) o 'sell' (venta)." };
  }

  if (typeof tx.amount !== "number" || isNaN(tx.amount) || tx.amount <= 0) {
    return { isValid: false, error: "La cantidad debe ser un número estrictamente mayor que 0." };
  }

  if (typeof tx.pricePerUnit !== "number" || isNaN(tx.pricePerUnit) || tx.pricePerUnit < 0) {
    return { isValid: false, error: "El precio unitario no puede ser negativo o inválido." };
  }

  if (typeof tx.fee !== "number" || isNaN(tx.fee) || tx.fee < 0) {
    return { isValid: false, error: "La comisión no puede ser un valor negativo o inválido." };
  }

  if (!tx.timestamp || typeof tx.timestamp !== "number" || isNaN(tx.timestamp) || tx.timestamp <= 0) {
    return { isValid: false, error: "La fecha y hora de la operación es obligatoria." };
  }

  // Validación anti-posiciones cortas para operaciones de venta
  if (tx.type === "sell" && tx.amount > availableAmount + FINANCIAL_EPSILON) {
    return {
      isValid: false,
      error: `Saldo insuficiente: intentas vender ${tx.amount}, pero solo posees ${availableAmount}.`,
    };
  }

  return { isValid: true };
};

/**
 * Calcula las posiciones agregadas de la cartera aplicando estrictamente el método FIFO (First-In, First-Out).
 * Es una función pura: no muta la lista original de transacciones y devuelve un nuevo conjunto de posiciones.
 *
 * @param transactions Lista de transacciones históricas registradas por el usuario
 * @param currentPrices Mapa de cotizaciones actuales en EUR { [coinId]: precioEUR }
 * @param coinMetadata Mapa opcional de metadatos { [coinId]: { name, symbol, image } }
 */
export const calculatePortfolioPositions = (
  transactions: ReadonlyArray<Transaction>,
  currentPrices: Record<string, number | null | undefined> = {},
  coinMetadata: Record<string, { name?: string; symbol?: string; image?: string }> = {},
): PortfolioPosition[] => {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // 1. Clona y ordena cronológicamente por timestamp ascendente para garantizar la trazabilidad FIFO
  const sortedTx = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

  // 2. Agrupa por activo para procesar la cola de lotes de forma independiente
  const lotsByCoin = new Map<string, ActiveLot[]>();
  const realizedPnlByCoin = new Map<string, number>();
  const totalFeesByCoin = new Map<string, number>();

  for (const tx of sortedTx) {
    const coinId = tx.coinId.toLowerCase();
    const lots = lotsByCoin.get(coinId) || [];
    const currentRealized = realizedPnlByCoin.get(coinId) || 0;
    const currentFees = totalFeesByCoin.get(coinId) || 0;

    // Acumula comisiones totales pagadas en este activo
    totalFeesByCoin.set(coinId, currentFees + (tx.fee || 0));

    if (tx.type === "buy") {
      // Las comisiones de compra incrementan la base del coste total del lote
      const lotCostBasis = tx.amount * tx.pricePerUnit + (tx.fee || 0);

      lots.push({
        id: tx.id,
        remainingAmount: tx.amount,
        remainingCostBasis: lotCostBasis,
        pricePerUnit: tx.pricePerUnit,
        timestamp: tx.timestamp,
      });

      lotsByCoin.set(coinId, lots);
    } else if (tx.type === "sell") {
      let remainingToSell = tx.amount;
      let realizedPnlFromSale = 0;

      // Calcula el balance disponible actual antes de consumir los lotes
      const currentAvailable = lots.reduce((acc, lot) => acc + lot.remainingAmount, 0);

      if (remainingToSell > currentAvailable + FINANCIAL_EPSILON) {
        throw new InsufficientBalanceError(coinId, tx.amount, currentAvailable);
      }

      // Consume lotes en orden FIFO (desde el más antiguo)
      for (const lot of lots) {
        if (remainingToSell <= FINANCIAL_EPSILON) {
          break;
        }

        if (lot.remainingAmount <= FINANCIAL_EPSILON) {
          continue;
        }

        const qtyToConsume = Math.min(remainingToSell, lot.remainingAmount);
        const lotUnitCost = lot.remainingCostBasis / lot.remainingAmount;
        const costOfConsumed = lotUnitCost * qtyToConsume;

        // Actualiza el lote contable
        lot.remainingAmount -= qtyToConsume;
        lot.remainingCostBasis -= costOfConsumed;

        // Si el lote queda residualmente en cero, limpia residuos de coma flotante
        if (lot.remainingAmount <= FINANCIAL_EPSILON) {
          lot.remainingAmount = 0;
          lot.remainingCostBasis = 0;
        }

        // Ingresos brutos de la venta de esta fracción
        const proceeds = qtyToConsume * tx.pricePerUnit;

        // Comisión de venta prorrateada atribuida a esta porción
        const proratedFee = tx.amount > 0 ? (qtyToConsume / tx.amount) * (tx.fee || 0) : 0;

        // Beneficio/Pérdida realizado = Ingresos - Coste de Adquisición - Comisión atribuida
        realizedPnlFromSale += proceeds - costOfConsumed - proratedFee;
        remainingToSell -= qtyToConsume;
      }

      realizedPnlByCoin.set(coinId, currentRealized + realizedPnlFromSale);
      lotsByCoin.set(coinId, lots);
    }
  }

  // 3. Consolida las posiciones resultantes para cada activo
  const positions: PortfolioPosition[] = [];

  for (const [coinId, lots] of lotsByCoin.entries()) {
    const remainingAmount = lots.reduce((acc, lot) => acc + lot.remainingAmount, 0);
    const totalCostBasis = lots.reduce((acc, lot) => acc + lot.remainingCostBasis, 0);
    const realizedPnl = realizedPnlByCoin.get(coinId) || 0;
    const totalFees = totalFeesByCoin.get(coinId) || 0;

    // Si la posición fue completamente liquidada (remainingAmount === 0), pero hubo operaciones y P&L realizado,
    // conservamos la posición con saldo 0 solo si se solicita o calculamos sus métricas
    const averageBuyPrice = remainingAmount > FINANCIAL_EPSILON ? totalCostBasis / remainingAmount : 0;

    // Obtención del precio actual de mercado
    const rawPrice = currentPrices[coinId];
    const isPriceAvailable =
      rawPrice !== null && rawPrice !== undefined && typeof rawPrice === "number" && !isNaN(rawPrice);

    let currentPrice: number | null = null;
    let currentValue: number | null = null;
    let unrealizedPnl: number | null = null;
    let unrealizedPnlPercentage: number | null = null;

    if (isPriceAvailable) {
      currentPrice = rawPrice;
      currentValue = remainingAmount * currentPrice;
      unrealizedPnl = currentValue - totalCostBasis;
      unrealizedPnlPercentage =
        totalCostBasis > FINANCIAL_EPSILON ? (unrealizedPnl / totalCostBasis) * 100 : 0;
    }

    const meta = coinMetadata[coinId] || {};

    positions.push({
      coinId,
      coinSymbol: meta.symbol,
      coinName: meta.name,
      coinImage: meta.image,
      amount: remainingAmount <= FINANCIAL_EPSILON ? 0 : remainingAmount,
      totalCostBasis: totalCostBasis <= FINANCIAL_EPSILON ? 0 : totalCostBasis,
      averageBuyPrice,
      currentPrice,
      currentValue,
      unrealizedPnl,
      unrealizedPnlPercentage,
      realizedPnl,
      totalFees,
      allocationPercentage: 0, // Se computa en el siguiente paso con el valor total de la cartera
    });
  }

  // 4. Calcula la ponderación y distribución porcentual de cada posición
  const totalPortfolioValue = positions.reduce((acc, pos) => {
    return acc + (pos.currentValue !== null && pos.currentValue > 0 ? pos.currentValue : 0);
  }, 0);

  for (const pos of positions) {
    if (totalPortfolioValue > 0 && pos.currentValue !== null && pos.currentValue > 0) {
      pos.allocationPercentage = (pos.currentValue / totalPortfolioValue) * 100;
    } else {
      pos.allocationPercentage = 0;
    }
  }

  // Ordena por valor actual descendente (o coste si el precio no está disponible)
  return positions.sort((a, b) => (b.currentValue || b.totalCostBasis) - (a.currentValue || a.totalCostBasis));
};

/**
 * Calcula las métricas financieras globales de la cartera.
 *
 * @param positions Posiciones consolidadas de la cartera
 * @param transactionCount Número total de transacciones históricas registradas
 */
export const calculatePortfolioSummary = (
  positions: ReadonlyArray<PortfolioPosition>,
  transactionCount = 0,
): PortfolioSummary => {
  let totalCurrentValue = 0;
  let totalCostBasis = 0;
  let totalUnrealizedPnl = 0;
  let totalRealizedPnl = 0;
  let totalFees = 0;
  let hasUnavailablePrices = false;
  let activePositionsCount = 0;

  for (const pos of positions) {
    totalRealizedPnl += pos.realizedPnl;
    totalFees += pos.totalFees;

    if (pos.amount > FINANCIAL_EPSILON) {
      activePositionsCount++;
      totalCostBasis += pos.totalCostBasis;

      if (pos.currentValue !== null && pos.unrealizedPnl !== null) {
        totalCurrentValue += pos.currentValue;
        totalUnrealizedPnl += pos.unrealizedPnl;
      } else {
        hasUnavailablePrices = true;
      }
    }
  }

  const totalUnrealizedPnlPercentage =
    totalCostBasis > FINANCIAL_EPSILON ? (totalUnrealizedPnl / totalCostBasis) * 100 : 0;

  return {
    totalCurrentValue,
    totalCostBasis,
    totalUnrealizedPnl,
    totalUnrealizedPnlPercentage,
    totalRealizedPnl,
    totalFees,
    hasUnavailablePrices,
    positionCount: activePositionsCount,
    transactionCount,
  };
};

/**
 * Genera la distribución visual de la cartera filtrando posiciones activas con valor.
 */
export const calculatePortfolioDistribution = (
  positions: ReadonlyArray<PortfolioPosition>,
): Array<{
  coinId: string;
  symbol: string;
  name: string;
  percentage: number;
  value: number;
}> => {
  return positions
    .filter((pos) => pos.amount > FINANCIAL_EPSILON && pos.currentValue !== null && pos.currentValue > 0)
    .map((pos) => ({
      coinId: pos.coinId,
      symbol: pos.coinSymbol || pos.coinId.toUpperCase(),
      name: pos.coinName || pos.coinId,
      percentage: pos.allocationPercentage,
      value: pos.currentValue || 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
};
