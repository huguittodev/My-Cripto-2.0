# 🪙 My Crypto 2.0 — Terminal Financiera de Criptomonedas

**My Crypto 2.0** es una terminal de seguimiento, análisis e investigación de criptomonedas diseñada para inversores particulares. Ofrece datos de mercado en tiempo real, visualizaciones técnicas interactivas, personalización con lista de favoritos y un motor de cartera con contabilidad FIFO rigurosa y no custodial.

Desarrollada con **React 19**, **TypeScript**, **Vite** y **Tailwind CSS**, integrando la API pública de **CoinGecko v3**.

---

## 🚀 Funcionalidades Principales

### 1. Market Overview y Métricas Globales
- **Indicadores macroeconómicos en tiempo real:** Capitalización total del mercado en EUR, volumen global de 24 horas, dominancia de Bitcoin y variación global en 24h, obtenidos directamente desde el endpoint `/global` de CoinGecko.
- **Transparencia en datos:** Identificación explícita de la fuente, moneda de cotización (EUR) y fallbacks etiquetados cuando la API macro experimenta limitaciones.
- **Top Movers:** Detección automática de mayores subidas (*gainers*) y mayores bajadas (*losers*) del mercado.

### 2. Explorador de Mercados Avanzado
- **Catálogo paginado:** Exploración de mercados con 25 activos por página y ordenación nativa por capitalización, volumen, precio y ranking.
- **Búsqueda instantánea:** Búsqueda textual reactiva por nombre o símbolo (`BTC`, `ETH`, `Solana`...).
- **Filtros por capitalización y rendimiento:** Segmentación por Mega/Large cap (> 10MM€), Mid cap (1MM€ - 10MM€) y Small cap (< 1MM€), así como filtros de activos alcistas o bajistas en 24h.
- **Minigráficos vectoriales (Sparklines):** Representación SVG de la trayectoria de precios de los últimos 7 días.

### 3. Zona de Análisis y Gráficos Interactivos
- **Serie histórica multirango:** Gráficos de línea con periodos de 24 Horas (`1D`), 7 Días (`7D`), 30 Días (`30D`), 90 Días (`90D`) y 1 Año (`1Y`).
- **Cálculo de métricas del periodo:** Rendimiento absoluto (€) y porcentual (%), precio mínimo y máximo alcanzados.
- **Crosshair y Tooltip:** Inspección interactiva de precios con fecha y hora precisa.

### 4. Watchlist Persistente
- Marcador de favoritos accesible (`FavoriteButton`) sincronizado en tiempo real mediante eventos reactivos.
- Vista dedicada de seguimiento con resumen de valor total y variación ponderada.
- Persistencia local en `localStorage` con respaldo en memoria ante errores o cuota excedida.

### 5. Motor de Cartera (Portfolio Engine)
- **Registro manual de transacciones:** Compras y ventas con cantidad, precio unitario de ejecución, comisiones y fecha.
- **Contabilidad FIFO (First-In, First-Out):** Asignación estricta de costes por lotes de adquisición.
- **Separación de beneficios:** Cálculo independiente de P&L no realizado (*unrealized*) y P&L realizado (*realized*).
- **Asignación y distribución:** Visualización de la cuota porcentual de cada activo en la cartera.
- **No custodial y privada:** Sin claves privadas, frases semilla ni conexión a exchanges. Todos los datos permanecen en el navegador.

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Biblioteca UI** | React 19 | Arquitectura modular de componentes y hooks |
| **Tipado** | TypeScript (Modo Estricto) | Seguridad de tipos en contratos de datos y cálculos financieros |
| **Build Tool** | Vite 8 | Servidor de desarrollo instantáneo y empaquetado optimizado |
| **Estilos** | Tailwind CSS | Sistema visual SaaS Azul con paleta de tokens semánticos `crypto.*` |
| **Tests** | Vitest | Pruebas unitarias para funciones puras de cálculo y servicios |
| **Proveedor de Datos** | CoinGecko v3 API | Cotizaciones, datos históricos, métricas globales y sparklines |

---

## 📦 Instalación y Ejecución

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/huguittodev/My-Cripto-2.0.git
   cd My-Cripto-2.0
   ```

2. **Instalar dependencias:**
   ```bash
   pnpm install
   # o con npm:
   npm install
   ```

3. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Ejecutar la suite de pruebas automatizadas:**
   ```bash
   npm test
   ```

5. **Comprobar linter y compilar para producción:**
   ```bash
   npm run lint
   npm run build
   ```

---

## 📂 Arquitectura de Directorios

```text
src/
 ├── components/
 │    ├── charts/        # Gráficos interactivos y selectores de periodo
 │    ├── common/        # Botón de favoritos, spinners y mensajes de error
 │    ├── layout/        # AppLayout, Header y Sidebar colapsable
 │    ├── markets/       # Tabla del explorador, filtros, paginación y sparklines
 │    ├── overview/      # MarketMetricsRow y zona de análisis
 │    ├── portfolio/     # Motor de cartera: resumen, posiciones, transacciones y formulario
 │    ├── ui/            # Badges, MetricCards y elementos visuales base
 │    └── watchlist/     # Vista de activos favoritos y estado vacío
 ├── hooks/              # Custom hooks: useMarketExplorer, useHistoricalChart, useWatchlist, usePortfolio
 ├── services/           # Capa de red y persistencia: api.ts, watchlistStorage.ts, portfolioStorage.ts
 ├── types/              # Contratos de tipos de dominio (crypto.d.ts)
 ├── utils/              # Funciones puras: calculations.ts, formatters.ts, marketFilters.ts, portfolioCalculations.ts
 ├── App.tsx             # Orquestador principal y enrutado de navegación
 ├── main.tsx            # Punto de entrada de la aplicación React
 └── index.css           # Directivas globales de Tailwind CSS
```

---

## 🔒 Privacidad y Responsabilidad Financiera

- **Informativo, no asesoramiento:** My Crypto 2.0 es una herramienta técnica de investigación y seguimiento. No ofrece recomendaciones de inversión ni asesoramiento fiscal.
- **Privacidad absoluta:** No recopila datos de navegación, no requiere inicio de sesión y no solicita contraseñas, claves privadas ni credenciales de API de exchanges.
