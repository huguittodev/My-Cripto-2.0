import { describe, it, expect } from "vitest";
import {
  evaluateAlert,
  evaluateAlerts,
  validateAlertInput,
  MAX_PRICE_STALENESS_MS,
} from "./alertEngine.ts";
import type { PriceAlert } from "../types/crypto";

describe("Alert Engine (Motor de Alertas)", () => {
  const baseAlert: PriceAlert = {
    id: "alert-btc-1",
    coinId: "bitcoin",
    coinSymbol: "btc",
    coinName: "Bitcoin",
    condition: "gte",
    targetPrice: 70000,
    currency: "eur",
    createdAt: 1700000000000,
    status: "active",
  };

  it("1. Alerta de subida (gte) se dispara exactamente al alcanzar o superar el objetivo", () => {
    // Exactamente igual
    const resultEqual = evaluateAlert(baseAlert, 70000, 1700001000000);
    expect(resultEqual.triggered).toBe(true);
    expect(resultEqual.alert.status).toBe("triggered");
    expect(resultEqual.alert.triggeredPrice).toBe(70000);
    expect(resultEqual.alert.triggeredAt).toBe(1700001000000);

    // Superior
    const resultHigher = evaluateAlert(baseAlert, 70500, 1700002000000);
    expect(resultHigher.triggered).toBe(true);
    expect(resultHigher.alert.status).toBe("triggered");
    expect(resultHigher.alert.triggeredPrice).toBe(70500);
  });

  it("2. Alerta de subida (gte) no se dispara si el precio está por debajo del objetivo", () => {
    const result = evaluateAlert(baseAlert, 69999.99, 1700001000000);
    expect(result.triggered).toBe(false);
    expect(result.alert.status).toBe("active");
    expect(result.alert.triggeredPrice).toBeUndefined();
  });

  it("3. Alerta de bajada (lte) se dispara al alcanzar o caer por debajo del objetivo", () => {
    const lteAlert: PriceAlert = {
      ...baseAlert,
      id: "alert-btc-lte",
      condition: "lte",
      targetPrice: 50000,
    };

    // Exactamente igual
    const resultEqual = evaluateAlert(lteAlert, 50000, 1700001000000);
    expect(resultEqual.triggered).toBe(true);
    expect(resultEqual.alert.status).toBe("triggered");
    expect(resultEqual.alert.triggeredPrice).toBe(50000);

    // Inferior
    const resultLower = evaluateAlert(lteAlert, 49500, 1700002000000);
    expect(resultLower.triggered).toBe(true);
    expect(resultLower.alert.status).toBe("triggered");
    expect(resultLower.alert.triggeredPrice).toBe(49500);
  });

  it("4. Alerta de bajada (lte) no se dispara por encima del objetivo", () => {
    const lteAlert: PriceAlert = {
      ...baseAlert,
      id: "alert-btc-lte",
      condition: "lte",
      targetPrice: 50000,
    };

    const result = evaluateAlert(lteAlert, 50000.01, 1700001000000);
    expect(result.triggered).toBe(false);
    expect(result.alert.status).toBe("active");
  });

  it("5. Una alerta desactivada (inactive) nunca se dispara", () => {
    const inactiveAlert: PriceAlert = {
      ...baseAlert,
      status: "inactive",
    };

    const result = evaluateAlert(inactiveAlert, 999999);
    expect(result.triggered).toBe(false);
    expect(result.alert.status).toBe("inactive");
  });

  it("6. Una alerta ya disparada (triggered) no genera notificaciones duplicadas", () => {
    const triggeredAlert: PriceAlert = {
      ...baseAlert,
      status: "triggered",
      triggeredAt: 1700000500000,
      triggeredPrice: 71000,
      lastNotifiedAt: 1700000500000,
    };

    const result = evaluateAlert(triggeredAlert, 75000);
    expect(result.triggered).toBe(false);
    expect(result.alert.triggeredPrice).toBe(71000); // Preserva datos originales
  });

  it("7. Precios inválidos (NaN, <= 0, null, undefined, infinito) no disparan alertas", () => {
    expect(evaluateAlert(baseAlert, null as unknown as number).triggered).toBe(false);
    expect(evaluateAlert(baseAlert, undefined as unknown as number).triggered).toBe(false);
    expect(evaluateAlert(baseAlert, NaN).triggered).toBe(false);
    expect(evaluateAlert(baseAlert, -500).triggered).toBe(false);
    expect(evaluateAlert(baseAlert, 0).triggered).toBe(false);
    expect(evaluateAlert(baseAlert, Infinity).triggered).toBe(false);
    expect(evaluateAlert(baseAlert, -Infinity).triggered).toBe(false);
  });

  it("8. Precios obsoletos o con error en batch evaluation no provocan falsos disparos", () => {
    const now = 1700005000000;
    const staleTimestamp = now - (MAX_PRICE_STALENESS_MS + 1000);

    const priceMap = {
      bitcoin: {
        price: 80000, // Supera targetPrice de 70000
        timestamp: staleTimestamp, // Pero es obsoleto
        isStale: true,
      },
    };

    const batchResult = evaluateAlerts([baseAlert], priceMap, now);
    expect(batchResult.triggeredAlerts.length).toBe(0);
    expect(batchResult.updatedAlerts[0].status).toBe("active");
  });

  it("13. Comportamiento documentado cuando el precio ya cumple la condición al crear", () => {
    // Caso GTE con precio actual mayor que el target
    const validationGte = validateAlertInput({
      coinId: "bitcoin",
      condition: "gte",
      targetPrice: 60000,
      currentPrice: 65000,
    });
    expect(validationGte.isValid).toBe(true);
    expect(validationGte.warning).toContain("El precio actual ya es igual o superior al objetivo");

    // Caso LTE con precio actual menor que el target
    const validationLte = validateAlertInput({
      coinId: "bitcoin",
      condition: "lte",
      targetPrice: 65000,
      currentPrice: 60000,
    });
    expect(validationLte.isValid).toBe(true);
    expect(validationLte.warning).toContain("El precio actual ya es igual o inferior al objetivo");
  });

  it("14. Evaluación por lotes procesa múltiples activos sin generar duplicados", () => {
    const alertEth: PriceAlert = {
      id: "alert-eth-1",
      coinId: "ethereum",
      coinSymbol: "eth",
      coinName: "Ethereum",
      condition: "gte",
      targetPrice: 3500,
      currency: "eur",
      createdAt: 1700000000000,
      status: "active",
    };

    const alertSol: PriceAlert = {
      id: "alert-sol-1",
      coinId: "solana",
      coinSymbol: "sol",
      coinName: "Solana",
      condition: "lte",
      targetPrice: 150,
      currency: "eur",
      createdAt: 1700000000000,
      status: "active",
    };

    const priceMap = {
      bitcoin: { price: 72000, timestamp: 1700000100000 }, // Dispara (>= 70000)
      ethereum: { price: 3400, timestamp: 1700000100000 },  // No dispara (< 3500)
      solana: { price: 140, timestamp: 1700000100000 },     // Dispara (<= 150)
    };

    const batch = evaluateAlerts([baseAlert, alertEth, alertSol], priceMap, 1700000100000);
    expect(batch.triggeredAlerts.length).toBe(2);
    expect(batch.triggeredAlerts.map((a) => a.id)).toEqual(["alert-btc-1", "alert-sol-1"]);

    // Si volvemos a evaluar el lote con las alertas actualizadas, no debe haber nuevos disparos
    const secondBatch = evaluateAlerts(batch.updatedAlerts, priceMap, 1700000200000);
    expect(secondBatch.triggeredAlerts.length).toBe(0);
  });

  describe("Validación de entradas de formulario", () => {
    it("Rechaza activo vacío o no string", () => {
      const res = validateAlertInput({
        coinId: "",
        condition: "gte",
        targetPrice: 100,
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("Rechaza condición no válida", () => {
      const res = validateAlertInput({
        coinId: "bitcoin",
        condition: "invalid" as unknown as "gte",
        targetPrice: 100,
      });
      expect(res.isValid).toBe(false);
    });

    it("Rechaza precio objetivo negativo, cero, NaN o infinito", () => {
      expect(validateAlertInput({ coinId: "btc", condition: "gte", targetPrice: 0 }).isValid).toBe(false);
      expect(validateAlertInput({ coinId: "btc", condition: "gte", targetPrice: -10 }).isValid).toBe(false);
      expect(validateAlertInput({ coinId: "btc", condition: "gte", targetPrice: NaN }).isValid).toBe(false);
      expect(validateAlertInput({ coinId: "btc", condition: "gte", targetPrice: Infinity }).isValid).toBe(false);
      expect(validateAlertInput({ coinId: "btc", condition: "gte", targetPrice: "not-a-number" }).isValid).toBe(false);
    });

    it("Detecta alertas duplicadas equivalentes activas para el mismo activo y objetivo", () => {
      const existing: PriceAlert[] = [baseAlert];
      const res = validateAlertInput({
        coinId: "bitcoin",
        condition: "gte",
        targetPrice: 70000,
        existingAlerts: existing,
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Ya existe una alerta activa");
    });

    it("Permite editar una alerta existente conservando su mismo precio sin falso positivo de duplicado", () => {
      const existing: PriceAlert[] = [baseAlert];
      const res = validateAlertInput({
        coinId: "bitcoin",
        condition: "gte",
        targetPrice: 70000,
        existingAlerts: existing,
        editingAlertId: "alert-btc-1",
      });
      expect(res.isValid).toBe(true);
    });
  });
});
