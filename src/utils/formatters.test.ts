import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatCompactNumber,
  formatPercentage,
  formatDateTime,
  formatRank,
} from "./formatters";

describe("formatters utils", () => {
  describe("formatCurrency", () => {
    it("debe formatear precios en euros estándar con 2 decimales", () => {
      const formatted = formatCurrency(65432.1);
      // Incluye el símbolo de euro y separador
      expect(formatted).toContain("€");
      expect(formatted).toContain("65.432,10");
    });

    it("debe formatear precios menores a 1 euro con mayor precisión (4 decimales)", () => {
      const formatted = formatCurrency(0.5678);
      expect(formatted).toContain("0,5678");
    });

    it("debe devolver '—' para valores nulos o indefinidos", () => {
      expect(formatCurrency(null)).toBe("—");
      expect(formatCurrency(undefined)).toBe("—");
      expect(formatCurrency(NaN)).toBe("—");
    });
  });

  describe("formatCompactNumber", () => {
    it("debe formatear millones y miles en notación compacta", () => {
      const formatted = formatCompactNumber(1200000000, "€");
      expect(formatted).toContain("€");
      expect(formatted.length).toBeLessThan(12);
    });

    it("debe devolver '—' para valores inválidos", () => {
      expect(formatCompactNumber(null)).toBe("—");
      expect(formatCompactNumber(undefined)).toBe("—");
    });
  });

  describe("formatPercentage", () => {
    it("debe formatear variaciones positivas con signo +", () => {
      expect(formatPercentage(4.56)).toBe("+4,56 %");
    });

    it("debe formatear variaciones negativas con signo -", () => {
      expect(formatPercentage(-3.21)).toBe("-3,21 %");
    });

    it("debe formatear cero sin signo si includeSign es true", () => {
      expect(formatPercentage(0)).toBe("0,00 %");
    });
  });

  describe("formatDateTime", () => {
    it("debe formatear fechas ISO válidas", () => {
      const formatted = formatDateTime("2026-10-17T20:30:00.000Z");
      expect(formatted).not.toBe("—");
      expect(formatted.length).toBeGreaterThan(5);
    });

    it("debe devolver '—' para fechas inválidas o vacías", () => {
      expect(formatDateTime(null)).toBe("—");
      expect(formatDateTime("fecha-invalida")).toBe("—");
    });
  });

  describe("formatRank", () => {
    it("debe anteponer el símbolo #", () => {
      expect(formatRank(1)).toBe("#1");
      expect(formatRank(15)).toBe("#15");
    });

    it("debe manejar valores inválidos", () => {
      expect(formatRank(null)).toBe("—");
    });
  });
});
