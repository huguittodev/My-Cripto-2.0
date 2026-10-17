import { describe, it, expect } from "vitest";
import {
  calculatePeriodPerformance,
  normalizeChartPoints,
  calculateMinMax,
} from "./calculations";
import type { ChartPoint } from "../types/crypto";

describe("calculatePeriodPerformance", () => {
  it("debe calcular correctamente una variación positiva", () => {
    const points: ChartPoint[] = [
      { timestamp: 1000, price: 100 },
      { timestamp: 2000, price: 125 },
    ];

    const result = calculatePeriodPerformance(points);

    expect(result.isValid).toBe(true);
    expect(result.startPrice).toBe(100);
    expect(result.endPrice).toBe(125);
    expect(result.absoluteChange).toBe(25);
    expect(result.percentageChange).toBe(25);
    expect(result.isPositive).toBe(true);
  });

  it("debe calcular correctamente una variación negativa", () => {
    const points: ChartPoint[] = [
      { timestamp: 1000, price: 200 },
      { timestamp: 2000, price: 150 },
    ];

    const result = calculatePeriodPerformance(points);

    expect(result.isValid).toBe(true);
    expect(result.startPrice).toBe(200);
    expect(result.endPrice).toBe(150);
    expect(result.absoluteChange).toBe(-50);
    expect(result.percentageChange).toBe(-25);
    expect(result.isPositive).toBe(false);
  });

  it("debe calcular correctamente una variación del 0 %", () => {
    const points: ChartPoint[] = [
      { timestamp: 1000, price: 50 },
      { timestamp: 2000, price: 50 },
    ];

    const result = calculatePeriodPerformance(points);

    expect(result.isValid).toBe(true);
    expect(result.startPrice).toBe(50);
    expect(result.endPrice).toBe(50);
    expect(result.absoluteChange).toBe(0);
    expect(result.percentageChange).toBe(0);
    expect(result.isPositive).toBe(false);
  });

  it("debe invalidar el cálculo si el precio inicial es igual a cero", () => {
    const points: ChartPoint[] = [
      { timestamp: 1000, price: 0 },
      { timestamp: 2000, price: 100 },
    ];

    const result = calculatePeriodPerformance(points);

    expect(result.isValid).toBe(false);
    expect(result.percentageChange).toBe(0);
    expect(result.absoluteChange).toBe(0);
  });

  it("debe manejar una serie vacía", () => {
    const result = calculatePeriodPerformance([]);

    expect(result.isValid).toBe(false);
    expect(result.startPrice).toBe(0);
    expect(result.endPrice).toBe(0);
    expect(result.percentageChange).toBe(0);
    expect(result.absoluteChange).toBe(0);
  });

  it("debe manejar una serie con un solo punto", () => {
    const points: ChartPoint[] = [{ timestamp: 1000, price: 80 }];

    const result = calculatePeriodPerformance(points);

    expect(result.isValid).toBe(true);
    expect(result.startPrice).toBe(80);
    expect(result.endPrice).toBe(80);
    expect(result.absoluteChange).toBe(0);
    expect(result.percentageChange).toBe(0);
    expect(result.isPositive).toBe(false);
  });

  it("debe manejar valores no finitos o inválidos (NaN, Infinity)", () => {
    const pointsWithNaN: ChartPoint[] = [
      { timestamp: 1000, price: NaN },
      { timestamp: 2000, price: 100 },
    ];
    const pointsWithInf: ChartPoint[] = [
      { timestamp: 1000, price: 100 },
      { timestamp: 2000, price: Infinity },
    ];

    expect(calculatePeriodPerformance(pointsWithNaN).isValid).toBe(false);
    expect(calculatePeriodPerformance(pointsWithInf).isValid).toBe(false);
  });
});

describe("normalizeChartPoints", () => {
  it("debe normalizar correctamente una respuesta cruda válida", () => {
    const raw = [
      [1729200000000, 60000.5],
      [1729203600000, 60500.25],
    ];

    const result = normalizeChartPoints(raw);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ timestamp: 1729200000000, price: 60000.5 });
    expect(result[1]).toEqual({ timestamp: 1729203600000, price: 60500.25 });
  });

  it("debe descartar elementos corruptos, nulos o no numéricos", () => {
    const raw = [
      null,
      [1000, "invalido"],
      [NaN, 50],
      [2000, -10],
      [3000, 100],
      "texto",
    ];

    const result = normalizeChartPoints(raw);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ timestamp: 3000, price: 100 });
  });

  it("debe ordenar cronológicamente puntos desordenados", () => {
    const unordered = [
      [3000, 120],
      [1000, 100],
      [2000, 110],
    ];

    const result = normalizeChartPoints(unordered);

    expect(result.map((p) => p.timestamp)).toEqual([1000, 2000, 3000]);
    expect(result.map((p) => p.price)).toEqual([100, 110, 120]);
  });

  it("debe deduplicar puntos con timestamps idénticos conservando el último valor", () => {
    const duplicates = [
      [1000, 100],
      [2000, 110],
      [2000, 115], // duplicado con nuevo valor
      [3000, 120],
    ];

    const result = normalizeChartPoints(duplicates);

    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ timestamp: 2000, price: 115 });
  });

  it("debe devolver un array vacío si la entrada no es un array o no tiene puntos válidos", () => {
    expect(normalizeChartPoints(null)).toEqual([]);
    expect(normalizeChartPoints({})).toEqual([]);
    expect(normalizeChartPoints(undefined)).toEqual([]);
  });
});

describe("calculateMinMax", () => {
  it("debe encontrar el mínimo y máximo de una serie de puntos", () => {
    const points: ChartPoint[] = [
      { timestamp: 1000, price: 150 },
      { timestamp: 2000, price: 90 },
      { timestamp: 3000, price: 210 },
      { timestamp: 4000, price: 180 },
    ];

    const { min, max } = calculateMinMax(points);

    expect(min).toBe(90);
    expect(max).toBe(210);
  });

  it("debe devolver 0 si la serie está vacía", () => {
    expect(calculateMinMax([])).toEqual({ min: 0, max: 0 });
  });
});
