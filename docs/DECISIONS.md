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


