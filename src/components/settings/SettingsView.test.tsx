import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { SettingsView } from "./SettingsView.tsx";
import { SettingsProvider } from "../../context/SettingsContext.tsx";
import { clearAllStoredData, resetStoredSettings, saveStoredSettings } from "../../services/settingsStorage.ts";

describe("SettingsView Component (Fase 10 - System Settings)", () => {
  let memoryStore: Record<string, string> = {};

  beforeEach(() => {
    memoryStore = {};
    const mockStorage: Storage = {
      getItem: vi.fn((key: string) => memoryStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        memoryStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete memoryStore[key];
      }),
      clear: vi.fn(() => {
        memoryStore = {};
      }),
      key: vi.fn((idx: number) => Object.keys(memoryStore)[idx] || null),
      get length() {
        return Object.keys(memoryStore).length;
      },
    };

    vi.restoreAllMocks();
    if (typeof window !== "undefined") {
      Object.defineProperty(window, "localStorage", {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    }
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    resetStoredSettings();
  });

  afterEach(() => {
    clearAllStoredData();
  });

  it("renderiza el título y las seis secciones funcionales del sistema", () => {
    const html = renderToString(
      <SettingsProvider>
        <SettingsView />
      </SettingsProvider>,
    );

    // Título y descripción principal
    expect(html).toContain("Ajustes del Sistema");
    expect(html).toContain("Configura tus preferencias globales de divisa base, apariencia visual, conectividad de mercado y privacidad local.");

    // 6 Secciones requeridas por Fase 10
    expect(html).toContain("General");
    expect(html).toContain("Divisa Base y Formato Financiero");
    expect(html).toContain("Proveedor de Datos y Conectividad");
    expect(html).toContain("Apariencia y Modo de Color");
    expect(html).toContain("Privacidad y Gestión de Datos Locales");
    expect(html).toContain("Información de la Aplicación");
  });

  it("renderiza las opciones de divisa base (EUR, USD, GBP) y su previsualización en vivo", () => {
    const html = renderToString(
      <SettingsProvider>
        <SettingsView />
      </SettingsProvider>,
    );

    // Opciones de divisas soportadas con código y símbolo
    expect(html).toContain("EUR");
    expect(html).toContain("USD");
    expect(html).toContain("GBP");
    expect(html).toContain("€");
    expect(html).toContain("$");
    expect(html).toContain("£");

    // Previsualización de formatos numéricos y micro-caps
    expect(html).toContain("Vista previa en vivo del formateador centralizado");
    expect(html).toContain("Precio Estándar");
    expect(html).toContain("Cifra Compacta");
    expect(html).toContain("Micro-precio (8 dec)");
  });

  it("renderiza el proveedor activo CoinGecko v3 y los controles de caché y prueba", () => {
    const html = renderToString(
      <SettingsProvider>
        <SettingsView />
      </SettingsProvider>,
    );

    // Identificación técnica del proveedor
    expect(html).toContain("CoinGecko v3");
    expect(html).toContain("/api/coingecko");
    expect(html).toContain("Comprobar conexión");
    expect(html).toContain("Limpiar caché en memoria");

    // Información de rate limits
    expect(html).toContain("10 - 30 req / minuto");
  });

  it("renderiza los tres modos de apariencia (Oscuro, Claro, Sistema)", () => {
    const html = renderToString(
      <SettingsProvider>
        <SettingsView />
      </SettingsProvider>,
    );

    expect(html).toContain("Oscuro (Dark)");
    expect(html).toContain("Claro (Light)");
    expect(html).toContain("Sistema (Auto)");
  });

  it("muestra el diagnóstico de almacenamiento local y los botones de reinicio y peligro", () => {
    const html = renderToString(
      <SettingsProvider>
        <SettingsView />
      </SettingsProvider>,
    );

    // Diagnóstico de almacenamiento
    expect(html).toContain("Espacio Utilizado");
    expect(html).toContain("En Watchlist");
    expect(html).toContain("Transacciones Cartera");
    expect(html).toContain("Alertas Creadas");

    // Acciones de gestión y protección de datos
    expect(html).toContain("Restablecer Ajustes a Valores Predeterminados");
    expect(html).toContain("No borra tu cartera, alertas ni watchlist");
    expect(html).toContain("Zona de Peligro: Borrar Todos los Datos Locales");
  });

  it("renderiza la información del sistema, versión 2.0.0, analista IA y aviso no custodial", () => {
    const html = renderToString(
      <SettingsProvider>
        <SettingsView />
      </SettingsProvider>,
    );

    expect(html).toContain("My Crypto 2.0");
    expect(html).toContain("v2.0.0");
    expect(html).toContain("AI Crypto Analyst");
    expect(html).toContain("No Custodial (100% Local)");
    expect(html).toContain("Aviso de Exención de Responsabilidad");
  });

  it("refleja configuraciones personalizadas cuando están almacenadas en localStorage", () => {
    saveStoredSettings({
      currency: "USD",
      theme: "light",
      autoRefreshInterval: 120,
    });

    const html = renderToString(
      <SettingsProvider>
        <SettingsView />
      </SettingsProvider>,
    );

    // Debe mostrar USD como divisa seleccionada y activa
    expect(html).toContain("USD");
    expect(html).toContain("vs_currency=<!-- -->usd");
    expect(html).toContain('value="120" selected=""');
    expect(html).toContain("light");
  });
});
