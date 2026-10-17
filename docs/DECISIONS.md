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
| Pendiente | No migrar el stack antes de auditar | Reducir riesgo y trabajo innecesario | Mantener dependencias actuales hasta justificar cambios |
| Pendiente | Cartera manual y no custodial en MVP | Evitar credenciales y complejidad de seguridad | Sin claves privadas ni conexiones de trading |
