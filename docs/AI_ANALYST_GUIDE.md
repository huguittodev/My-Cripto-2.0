# Guía de AI Crypto Analyst — My Crypto 2.0 (Google Gemini API)

Este documento detalla la arquitectura, configuración, seguridad, funcionamiento y despliegue del módulo **AI Crypto Analyst** integrado en la terminal **My Crypto 2.0**.

---

## 1. Visión general y principios de diseño

El **AI Crypto Analyst** es un asistente analítico contextual diseñado para interpretar datos técnicos de mercado, explicar métricas financieras y analizar carteras de criptomonedas bajo demanda explícita.

### Principios obligatorios:
1. **Basado en datos verificados:** El modelo recibe métricas reales consolidadas de CoinGecko (precio EUR, variación 24h, rangos mínimo/máximo, capitalización, volumen, tendencias históricas y agregados macroeconómicos).
2. **Distinción epistémica:** Diferencia con claridad entre **hechos observados** (datos empíricos proporcionados), **interpretaciones técnicas** y **desconocimiento o incertidumbre** ante información faltante o eventos externos no verificados.
3. **No es asesor financiero:** No emite órdenes de compra o venta, no promete rentabilidades ni realiza predicciones especulativas como certezas.
4. **Privacidad estricta:** La información de cartera **nunca** se envía automáticamente. Se requiere activación manual explícita y solo se transmite un resumen anónimo agregado (valor total, coste medio, P&L latente/realizado y pesos relativos). Las transacciones individuales, fechas exactas y notas privadas nunca salen del cliente.
5. **Aislamiento de credenciales:** La clave `GEMINI_API_KEY` reside exclusivamente en el entorno del servidor/proxy. El bundle público de Vite no contiene claves ni referencias a `VITE_GEMINI_API_KEY`.

---

## 2. Cómo conseguir una clave de Gemini API

Google ofrece un **nivel gratuito generoso (Free Tier)** para desarrolladores a través de Google AI Studio:

1. Accede a la consola oficial de Google AI Studio: [https://aistudio.google.com/](https://aistudio.google.com/)
2. Inicia sesión con tu cuenta de Google.
3. Haz clic en **"Get API Key"** (Obtener clave de API) en el menú lateral o superior.
4. Selecciona **"Create API Key"** y asígnala a un proyecto nuevo o existente de Google Cloud.
5. Copia la clave alfanumérica generada.
6. **Importante:** Conserva la clave en un lugar seguro y no la compartas ni la subas a GitHub.

---

## 3. Configuración de variables de entorno

Copia la plantilla `.env.example` para generar tu archivo local:

```bash
cp .env.example .env.local
```

Edita `.env.local` (o `.env`) con tus parámetros:

```env
# Clave de API de Google Gemini (Google AI Studio)
GEMINI_API_KEY=AIzaSy...tu_clave_real_aqui

# Nombre del modelo de Gemini a utilizar (compatible con Free Tier)
# Opciones recomendadas: gemini-2.5-flash (predeterminado), gemini-1.5-flash
GEMINI_MODEL=gemini-2.5-flash

# Clave opcional de CoinGecko Demo API (si dispones de ella)
COINGECKO_API_KEY=

# Puerto del servidor proxy Node.js para producción
PORT=3001
```

> [!NOTE]
> Todos los archivos `.env`, `.env.*` y `.env.local` están estrictamente excluidos de Git en el archivo `.gitignore` para prevenir fugas accidentales.

---

## 4. Cómo iniciar el proyecto

### Modo Desarrollo (Vite Dev Server con Middleware Integrado)
En desarrollo, Vite incluye un middleware Node.js que atiende automáticamente las rutas `/api/ai/analyst`, `/api/ai/status` y el proxy a CoinGecko `/api/coingecko/*`. **No necesitas levantar procesos paralelos**:

```bash
npm run dev
```

La aplicación se iniciará en `http://localhost:5173`. Navega a la sección **AI Market Analyst** en el menú lateral.

### Modo Producción (Servidor Proxy Node.js + Frontend Estático)
Para un entorno productivo autoalojado o contenedor Docker:

1. Compilar el cliente estático:
   ```bash
   npm run build
   ```
2. Iniciar el servidor proxy seguro:
   ```bash
   npm start
   # o: node server/proxy.mjs
   ```
El servidor Node.js en `server/proxy.mjs` expone los endpoints de IA, el proxy seguro de CoinGecko y sirve los activos estáticos desde `dist/`.

---

## 5. Pruebas y verificación del funcionamiento

### Comprobaciones automatizadas
La suite de pruebas incluye cobertura completa para cliente, servidor, formateo de contexto y mitigación de fugas:

```bash
# Ejecutar los 236 tests unitarios y de integración con Vitest
npm test

# Ejecutar el linter para garantizar calidad y cumplimiento de reglas
npm run lint

# Validar tipado TypeScript y compilación del bundle final
npm run build
```

### Verificación manual en la interfaz
1. **Estado sin clave:** Si `GEMINI_API_KEY` está vacía o ausente, la cabecera muestra la etiqueta `Configuración Pendiente` y un aviso informativo con el enlace para obtener la clave, sin romper la terminal.
2. **Consultas sugeridas:** Haz clic en una de las píldoras de sugerencias (ej: *"Analiza el mercado actual de Bitcoin"* o *"Compara Bitcoin y Ethereum"*).
3. **Contexto activo:** Selecciona un activo en la barra de contexto superior o en el explorador de mercados; el analista incorporará automáticamente precio actual, variación 24h, rangos y volumen.
4. **Privacidad de cartera:** Marca la casilla *"Incluir resumen de mi cartera"*. Comprueba que aparece la tarjeta de privacidad garantizada y realiza una consulta como *"¿Cómo ves la diversificación de mi cartera?"*.
5. **Prevención de abusos:**
   - Escribe un texto superior a 1000 caracteres: el contador numérico limita la entrada.
   - Envía varias peticiones consecutivas: el botón se desactiva temporalmente y se muestra la animación de análisis en curso con opción de *Detener análisis*.

---

## 6. Consulta de uso, cuotas y límites de Gemini Free Tier

Puedes monitorizar el consumo de tokens y solicitudes por minuto desde el panel de Google AI Studio:
- **Consola de límites y cuotas:** [https://aistudio.google.com/app/plan_information](https://aistudio.google.com/app/plan_information)
- **Documentación de Rate Limits:** [https://ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits)

### Límites típicos del nivel gratuito (Free Tier):
- **RPM (Requests Per Minute):** 15 solicitudes por minuto.
- **TPM (Tokens Per Minute):** 1.000.000 tokens por minuto (en modelos Flash).
- **RPD (Requests Per Day):** 1.500 solicitudes por día.

### Controles implementados en My Crypto 2.0:
- **Rate limiting local en memoria:** Máximo 15 peticiones/minuto por instancia.
- **Control de concurrencia:** Máximo 2 peticiones procesándose simultáneamente.
- **Caché en memoria (TTL 45s):** Las consultas idénticas con el mismo contexto de mercado se responden de inmediato sin invocar al modelo ni consumir cuota.
- **Mapeo de errores 429:** Si se alcanza la cuota de Google, el sistema informa al usuario con un mensaje claro y un botón de reintento con backoff.

---

## 7. Datos que se envían al proveedor de IA

### Datos de mercado verificados (CoinGecko v3):
- Identificador, símbolo y nombre de la criptomoneda.
- Cotización actual en EUR.
- Variación porcentual en 24h.
- Rango de precios 24h (mínimo / máximo).
- Capitalización de mercado y puesto en el ranking.
- Volumen total transaccionado en 24h.
- Resumen histórico agregado (días, precio inicio, precio fin, % cambio) si el gráfico está cargado.
- Marca de tiempo de actualización de CoinGecko y atribución de fuente.

### Resumen de cartera (SOLO con consentimiento explícito):
- Valoración actual global (€).
- Base de coste contable (€).
- Beneficio/pérdida latente total (€ y %).
- Beneficio/pérdida cerrado total (€).
- Número de posiciones abiertas.
- Reparto porcentual por activo (ej: Bitcoin 60%, Ethereum 40%).
- **NUNCA se envían:** Historial individual de compras/ventas, importes de transacciones pasadas, fechas de compra, comisiones, notas personales ni balances de billeteras.

---

## 8. Despliegue en producción

Dado que Vite produce una aplicación estática (SPA), la API de Gemini **requiere un entorno Node.js o funciones serverless** para proteger la clave privada:

| Entorno | Cómo desplegar |
|---|---|
| **VPS / Render / Railway / Fly.io** | Desplegar el repositorio completo. Comando de compilación: `npm run build`. Comando de arranque: `npm start`. Configurar `GEMINI_API_KEY` en el panel de variables de entorno del proveedor. |
| **Vercel / Netlify** | El frontend estático reside en `dist/`. La ruta `server/ai/` puede mapearse a una Serverless Function (`/api/ai/analyst` y `/api/ai/status`) configurando `GEMINI_API_KEY` en los ajustes del proyecto. |
| **Docker** | Usar una imagen base `node:22-alpine`, ejecutar `npm ci && npm run build`, exponer el puerto 3001 y ejecutar `node server/proxy.mjs`. |

---

## 9. Roadmap de extensiones futuras

1. **Noticias verificadas con citas:**
   - Conectar un agregador de noticias financieras con feed RSS estructurado (ej. CryptoPanic o CoinDesk).
   - Validar licencias y almacenar metadatos (titular, fuente, URL, fecha).
   - Inyectar las noticias como contexto verificado con citas numéricas obligatorias en las respuestas del analista.
2. **Autenticación y cuotas por usuario:**
   - Incorporar un sistema de autenticación (ej. Supabase Auth o JWT).
   - Sustituir el rate limiter en memoria por Redis o Postgres para limitar peticiones por identificador de usuario en aplicaciones multi-instancia.
3. **Soporte multimodal / Gráficos en imagen:**
   - Gemini 2.5 Flash admite entradas visuales; permitir capturas de gráficos de análisis técnico generadas en el cliente para interpretación asistida de patrones chartistas.
