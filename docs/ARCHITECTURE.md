# My Crypto 2.0 — Arquitectura del Sistema

Documento de referencia técnica sobre la arquitectura, flujo de datos, entidades de dominio, integraciones y persistencia de **My Crypto 2.0**.

---

## 1. Alcance Funcional de la Fase 1

La Fase 1 implementa una terminal financiera en tiempo real para inversores particulares, enfocada en la consulta, análisis y seguimiento selectivo del mercado de criptomonedas:

1. **Dashboard y Market Overview:**
   - Métricas macroeconómicas consolidadas obtenidas desde el endpoint `/global` de CoinGecko: capitalización total (EUR), volumen en 24h (EUR), dominancia de Bitcoin (%) y variación porcentual en 24h.
   - Fallbacks transparentes y etiquetados si la API macro no está disponible (muestreo de activos cargados con indicación explícita).
   - Visualización de líderes del mercado (top gainers / top losers).

2. **Explorador de Mercados:**
   - Exploración de activos con paginación configurable (25 por página).
   - Búsqueda textual y filtrado por nombre y símbolo.
   - Filtros por comportamiento en 24h (todos, en verde, en rojo) y por capitalización (Mega/Large, Mid, Small cap).
   - Ordenación multinivel (servidor vía CoinGecko y cliente en memoria).
   - Minigráficos interactivos (sparklines de 7 días) vectoriales en SVG.

3. **Zona de Análisis y Gráficos Históricos:**
   - Selección interactiva de criptomonedas.
   - Gráfico de precios con rangos de tiempo reales: 24 Horas (`1`), 7 Días (`7`), 30 Días (`30`), 90 Días (`90`) y 1 Año (`365`).
   - Cálculo del rendimiento del periodo (absoluto y porcentual), precios máximos y mínimos.
   - Tooltip interactivo con crosshair y formateo de fecha y divisa en EUR.

4. **Watchlist y Personalización Local:**
   - Marcador de favoritos accesible (`FavoriteButton`) en tablas, tarjetas y vistas de detalle.
   - Vista dedicada para la lista de seguimiento con cálculo de valor total de la selección y variaciones.
   - Persistencia local segura y resiliente a datos corruptos.

---

## 2. Arquitectura General y Flujo de Datos

El diseño sigue una arquitectura desacoplada por capas:

```
┌─────────────────────────────────────────────────────────────┐
│                       Capa de Presentación                  │
│  (AppLayout, Sidebar, MarketMetricsRow, MarketTable, etc.)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Consume hooks y estados
┌──────────────────────────────▼──────────────────────────────┐
│                    Capa de Estado y Custom Hooks            │
│  (useMarketExplorer, useHistoricalChart, useWatchlist, etc.)│
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│   Capa de Servicios y Red   │ │ Capa de Persistencia Local   │
│  (api.ts, CoinGecko v3 API) │ │ (watchlistStorage, etc.)    │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
┌──────────────▼───────────────────────────────▼──────────────┐
│                  Capa de Dominio y Utilidades               │
│  (formatters.ts, calculations.ts, marketFilters.ts)         │
└─────────────────────────────────────────────────────────────┘
```

### Principios Arquitectónicos
- **Separación de responsabilidades:** Los componentes visuales nunca invocan `fetch` directamente; consumen hooks o módulos de servicio.
- **Lógica pura independiente:** Todos los cálculos matemáticos, formateos de moneda y filtros son funciones puras con cobertura de tests unitarios al 100%.
- **Resiliencia ante fallos externos:** Errores de red o de rate limit se atrapan y mapean a clases tipadas (`RateLimitError`, `NetworkError`, `HttpError`, `UnexpectedDataError`), impidiendo bloqueos o datos inventados.

---

## 3. Integración con CoinGecko y Límites Técnicos

### Endpoints Utilizados
1. `GET /global`: Datos macroeconómicos agregados del ecosistema cripto.
2. `GET /coins/markets`: Cotizaciones, volumen, ranking, capitalización y sparkline de 7 días.
3. `GET /coins/{id}/market_chart`: Serie histórica de precios para análisis temporal.
4. `GET /search`: Búsqueda asistida por activos y contratos.

### Límites de la API Pública y Estrategias de Mitigación
- **Rate Limit:** La API pública gratuita impone un límite de entre 10 y 30 solicitudes por minuto según la IP.
- **Caché en memoria con TTL:**
  - `/coins/markets`: 60 segundos de caché por clave de parámetros (`vsCurrency-order-perPage-page-sparkline-ids`).
  - `/coins/{id}/market_chart`: 60 segundos para 24h (alta volatilidad) y 300 segundos para periodos mayores (7d a 365d).
  - `/search`: 120 segundos.
- **Cancelación de peticiones (`AbortController`):** Si el usuario cambia de activo o rango de tiempo rápidamente, las peticiones anteriores se abortan para evitar condiciones de carrera (*race conditions*) y no saturar el canal HTTP.
- **Deduplicación:** Evita peticiones redundantes cuando múltiples componentes requieren los mismos activos.

---

## 4. Persistencia de Watchlist

- **Clave de almacenamiento:** `my-crypto-watchlist-v1` en `localStorage`.
- **Estructura del payload:**
  ```typescript
  interface WatchlistStoragePayload {
    version: number;
    coinIds: string[];
    updatedAt: number;
  }
  ```
- **Tolerancia a fallos:**
  - Si el contenido de `localStorage` está corrupto o tiene un formato no válido, se captura el error y se inicializa en memoria sin interrumpir la ejecución.
  - Si `localStorage` no está disponible (modo incógnito estricto o cuota excedida), se activa automáticamente un respaldo en memoria (*in-memory fallback*).
- **Sincronización reactiva:**
  - Cuando se añade o quita un activo, se emite un evento del DOM (`mycrypto:watchlist_updated`) y se escucha el evento nativo `storage` para sincronizar pestañas abiertas del mismo navegador.
- **Limitación conocida:** La persistencia está restringida al navegador y dispositivo local; no hay sincronización entre diferentes dispositivos al no requerir cuenta de usuario.

---

## 5. Decisiones Técnicas y Convenciones

1. **Stack Tecnológico:**
   - React 19 + TypeScript (modo estricto, sin `any`).
   - Vite 8 como empaquetador ultrarrápido.
   - Tailwind CSS con tokens semánticos corporativos `crypto.*`.
   - Vitest como suite de pruebas automatizadas.

2. **Sistema Visual (SaaS Azul Técnico):**
   - Fondo: `#0B1020` (`bg-crypto-bg`).
   - Superficies: `#111A2E` (`bg-crypto-surface`), `#18243B` (`bg-crypto-surface-hover`).
   - Marca y selecciones: `#3B82F6` (`crypto-primary`), `#60A5FA` (`crypto-accent`).
   - Indicadores financieros: `#22C55E` (`crypto-positive`) y `#F87171` (`crypto-negative`), reservados exclusivamente para variaciones.

3. **Formateo y Precisión Financiera:**
   - Módulo centralizado `src/utils/formatters.ts` que implementa `Intl.NumberFormat` con localización `es-ES` y moneda `EUR`.
   - Regla de precisión de precios: cotizaciones mayores o iguales a 1 € muestran 2 decimales; precios menores a 1 € muestran hasta 4-6 decimales significativos.

---

## 6. Arquitectura de Ajustes del Sistema (Fase 10 - System Settings)

El subsistema de configuración gestiona las preferencias globales de la aplicación mediante un flujo centralizado y desacoplado:

### 1. Entidades y Esquema de Preferencias (`src/types/settings.ts`)
```typescript
export type BaseCurrency = "EUR" | "USD" | "GBP";
export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export interface AppSettings {
  currency: BaseCurrency;
  theme: ThemeMode;
  autoRefreshInterval: number; // segundos (0 = manual)
}
```

### 2. Persistencia y Resiliencia (`src/services/settingsStorage.ts`)
- **Clave:** `my-crypto-settings-v1` en `localStorage` con payload versionado (`version: 1`).
- **Sanitización estricta:** La función `sanitizeSettings(raw)` verifica que cada valor pertenezca a los tipos admitidos. Ante corrupción o datos anómalos, restaura el valor por defecto seguro sin romper la sesión.
- **Aislamiento de reinicio:** El método `resetStoredSettings()` reescribe únicamente las preferencias del sistema, preservando íntegramente las transacciones de cartera (`my-crypto-portfolio-v1`), favoritos (`my-crypto-watchlist-v1`) y alertas (`my-crypto-alerts-v1`).
- **Borrado total con confirmación:** `clearAllStoredData()` elimina de forma controlada exclusivamente las 4 claves del proyecto.

### 3. Contexto React y Sincronización Global (`src/context/SettingsContext.tsx`)
- `SettingsProvider` expone el estado reactivo `useSettings()`.
- Soporta cambio dinámico de tema aplicando clases `html.light` y `html.dark` y atributos `data-theme`.
- Escucha activamente `window.matchMedia("(prefers-color-scheme: dark)")` para responder a cambios en el sistema operativo cuando el modo es `system`.
- Proporciona formateadores centralizados `formatMoney` y `formatCompact` vinculados a la divisa activa.
- Provee un fallback transparente cuando se invoca fuera de un `<SettingsProvider>` para pruebas unitarias aisladas.

### 4. Sistema Visual Adaptativo (Tokens Tailwind + CSS Variables)
`tailwind.config.js` mapea la paleta `crypto.*` a variables CSS con canales RGB `rgba(var(--crypto-*), <alpha-value>)`. Esto permite:
- Cambiar instantáneamente de modo oscuro a modo claro sin recarga de página.
- Mantener compatibilidad total con modificadores de opacidad de Tailwind (ej. `border-crypto-primary/30`, `bg-crypto-surface-hover/50`).

---

## 7. Estado del Roadmap

| Fase | Módulo | Estado | Enfoque |
|---|---|---|---|
| **Fase 1-6** | Market Overview, Explorador, Gráficos, Watchlist | **Completada** | Datos en tiempo real, filtros, persistencia local y UI SaaS |
| **Fase 7** | Motor de Cartera (Portfolio Engine) | **Completada** | Registro manual de transacciones, método FIFO, P&L realizado/no realizado |
| **Fase 8** | Alertas de Precio Locales | **Completada** | Umbrales técnicos (≥ y ≤), notificaciones in-app y de escritorio |
| **Fase 9** | AI Crypto Analyst (Gemini API) | **Completada** | Proxy backend seguro, modelo gemini-2.5-flash y análisis contextual |
| **Fase 10** | System Settings (Ajustes Globales) | **Completada** | Divisas base (EUR/USD/GBP), temas (dark/light/system), refresco automático, diagnóstico de conectividad y gestión de datos |
| **Fase 11** | Lanzamiento y Validación | Planificada | Auditoría final de accesibilidad, despliegue y portfolio LinkedIn |
