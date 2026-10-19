# My Crypto 2.0 — decisiones técnicas

Registra aquí decisiones que afecten al producto y al código. No des por decidido nada que aún no se haya verificado en el repositorio.

## Pendientes tras la auditoría
- Proveedor principal de datos de mercado y endpoints disponibles en el plan elegido.
- Si hace falta proxy/backend para API keys, caché o alertas en segundo plano.
- Librería de gráficos adecuada al tipo de gráfico (línea primero; velas solo si se justifican).
- Librería para estado/cache de servidor, según dependencias y complejidad reales.
- Persistencia de watchlist/cartera: navegador primero o autenticación/sincronización posterior.
- Política de cálculo de coste de cartera y cómo explicar sus limitaciones.
- Política de privacidad y retención si se añade backend/IA.

## Registro
| Fecha | Decisión | Motivo | Consecuencia |
|---|---|---|---|
| 2026-10-17 | Conservación del stack React 19 + Vite + Tailwind | Reducir riesgo de migración y mantener compatibilidad con WSL | Sin reescrituras innecesarias; extensión de tokens de Tailwind |
| 2026-10-17 | Sistema de diseño oscuro de terminal financiera (carbón #0B0D12, superficies #11141C / #171B26, acentos violeta y cian) | Otorgar identidad visual técnica, sobria y profesional a My Crypto 2.0 | Coherencia visual sin glassmorphism excesivo ni emojis |
| 2026-10-17 | Centralización de formateadores en módulo puro (`src/utils/formatters.ts`) con pruebas unitarias | Evitar duplicidad de cálculos y formatos de divisas, porcentajes y fechas | Código reutilizable, desacoplado de componentes y testeable |
| 2026-10-17 | Conservación de la consulta a CoinGecko v3 y controles de número de activos | Cumplir con la regla de no romper funcionalidades previas | La app carga datos reales de inmediato y permite ajustar el tamaño del feed |
| 2026-10-17 | Tratamiento explícito de secciones no implementadas con tags "Próximamente" / "Fase X" | Transparencia de producto y no simular datos o funcionalidades inexistentes | Estructura de navegación lista para las fases posteriores |
| 2026-10-17 | Establecimiento de sistema visual SaaS azul (#0B1020, #111A2E, #3B82F6, #60A5FA) | Reforzar la identidad de marca premium y homogeneizar el consumo de tokens en Tailwind | Los componentes usan directamente `bg-crypto-*`, `text-crypto-*` y `border-crypto-*` |
| 2026-10-17 | Cartera manual y no custodial en MVP | Evitar credenciales y complejidad de seguridad | Sin claves privadas ni conexiones de trading |
| 2026-10-18 | Cierre y validación formal de Fase 1 | Validar exhaustivamente la integración de mercado, gráficos y watchlist | 123 tests superados, build limpia y arquitectura documentada |
| 2026-10-18 | Método FIFO para valoración de cartera y cálculo de P&L | Proporcionar una contabilidad de lotes rigurosa, trazable y estándar en finanzas | Separación estricta entre beneficio realizado y no realizado; asignación precisa de lotes antiguos |
| 2026-10-18 | Validación estricta anti-posiciones cortas en operaciones de cartera | Prevenir inconsistencias financieras en un modelo de cartera no apalancada | No se permiten ventas superiores al saldo acumulado disponible |
| 2026-10-18 | Persistencia versionada `my-crypto-portfolio-v1` en localStorage | Aislamiento y resiliencia ante errores de almacenamiento o JSON corrupto | Respaldo en memoria automático y desacoplamiento de la interfaz mediante hook |
| 2026-10-19 | Motor de evaluación puro y desacoplado (`src/utils/alertEngine.ts`) | Garantizar testabilidad estricta, certidumbre en las condiciones de disparo (≥ y ≤) y prevención de falsos positivos o notificaciones repetidas | Lógica pura sin efectos secundarios, validada con 15 escenarios unitarios y tolerancia a precios obsoletos |
| 2026-10-19 | Persistencia versionada `my-crypto-alerts-v1` con respaldo en memoria | Proteger las alertas del usuario frente a recargas y tolerar fallos o datos corruptos en localStorage | Aislamiento con clave específica de My Crypto 2.0 y sincronización reactiva mediante evento custom `mycrypto:alerts_updated` |
| 2026-10-19 | Sistema dual de notificaciones (Toasts in-app + Notification API de escritorio) | Informar al usuario en tiempo real sin requerir un backend centralizado ni infraestructura de pago | Notificaciones visuales con navegación directa y avisos de escritorio protegidos contra fallos |
| 2026-10-19 | Consulta centralizada y reutilización de caché de mercado para alertas | Prevenir saturación de cuotas de CoinGecko y evitar temporizadores independientes por alerta | Sondeo periódico unificado (30s) combinando activos en memoria y consultas agrupadas por lote |
| 2026-10-19 | Aislamiento estricto de Gemini API en backend/proxy (sin clave cliente) | Proteger `GEMINI_API_KEY` frente a fugas en el bundle público de Vite | Endpoint `POST /api/ai/analyst` con variables de entorno del servidor y cero exposición en cliente |
| 2026-10-19 | Uso del SDK oficial `@google/genai` con modelo `gemini-2.5-flash` configurable | Emplear la librería actual de Google con cuota gratuita sin comprometer compatibilidad futura | Desacoplamiento de componentes React mediante adaptador y variable `GEMINI_MODEL` |
| 2026-10-19 | Inyección de datos de mercado verificados y distinción epistémica estricta | Evitar alucinaciones de precios, porcentajes y falsas noticias o atribuciones de causalidad | El modelo recibe cotizaciones EUR reales de CoinGecko y etiqueta hechos vs interpretaciones |
| 2026-10-19 | Envío de cartera opcional bajo consentimiento explícito y anónimo | Respetar la privacidad financiera del usuario sin recopilar datos personales en consultas generales | Se envían exclusivamente métricas agregadas (valor, coste, P&L, pesos) omitiendo transacciones y notas |
| 2026-10-19 | Control de cuota multinivel (rate limit 15 req/min, concurrencia 2, caché 45s) | Asegurar viabilidad dentro del nivel gratuito de Gemini y evitar saturación accidental | Deduplicación instantánea de consultas idénticas y códigos HTTP 429 descriptivos |
| 2026-10-19 | Divisa base reactiva con propagación nativa (`vs_currency=eur/usd/gbp`) | Mantener integridad financiera absoluta sin conversiones sintéticas ni aproximaciones de tipo de cambio | Consultas a CoinGecko nativas en la divisa seleccionada y formateador `Intl.NumberFormat` dinámico con soporte de micro-caps |
| 2026-10-19 | Sistema de temas mediante variables CSS RGB y tokens Tailwind (`html.light`/`html.dark`) | Permitir alternar entre Dark, Light y System sin recarga de página y manteniendo la paleta SaaS Azul | Paleta semántica `crypto.*` dinámica con soporte completo para opacidades (`bg-crypto-surface/30`) |
| 2026-10-19 | Aislamiento estricto de borrado en `settingsStorage` (`my-crypto-settings-v1`) | Proteger la cartera, watchlist y alertas frente a restauraciones de ajustes del sistema | "Restablecer ajustes" solo afecta a preferencias; la limpieza total requiere confirmación modal explícita |
| 2026-10-19 | Diagnóstico de conectividad y gestión de caché en tiempo real | Ofrecer transparencia operativa al usuario sin requerir herramientas de desarrollador | Ping en vivo a CoinGecko con cálculo de latencia y botón de purga de memoria intermedia |



