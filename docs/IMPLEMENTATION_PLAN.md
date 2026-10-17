# My Crypto 2.0 — plan de implementación

## Orden de trabajo
No construir todos los módulos a la vez. Cada fase termina con una demo funcional, una verificación y un commit.

### Fase 0 — auditoría del clon (sin cambiar código)
- Leer `package.json`, lockfile, README, estructura completa de `src/`, configuración, scripts y despliegue.
- Arrancar la app, anotar qué funciona, inspeccionar red/API y guardar capturas del estado actual.
- Ejecutar lint/build y apuntar errores preexistentes.
- Entregable: `docs/TECH_AUDIT.md` con stack real, flujos, dependencias, deuda, riesgos y archivos que conviene conservar.

### Fase 1 — definición técnica
- Confirmar qué proveedor de datos se usa y las condiciones actuales de sus endpoints, atribución, claves y límites.
- Dibujar una arquitectura sencilla adecuada al código actual.
- Definir tipos de dominio: `Asset`, `MarketSnapshot`, `PricePoint`, `WatchlistItem`, `PortfolioTransaction`, `PositionSummary`.
- Decidir ubicación de caché, persistencia inicial y estrategia de configuración/secretos.
- Entregable: `docs/ARCHITECTURE.md` y decisiones breves en `docs/DECISIONS.md`.

### Fase 2 — base visual y navegación
- Crear/normalizar tokens de diseño, tipografía, espaciado, colores, bordes, sombras y estados.
- Maquetar shell de aplicación: navegación lateral/topbar, contenido, selector EUR/USD y espacio para búsqueda.
- Definir componentes reutilizables de métrica, tabla, badge de variación, gráfico y estados vacíos/error.
- Confirmar responsive antes de añadir más módulos.

### Fase 3 — capa fiable de datos
- Crear un adapter de proveedor en `services/` y tipos propios que no copien ciegamente la respuesta externa.
- Configurar caché, deduplicación de consultas, cancelación al cambiar de página y reintentos limitados.
- Manejar rate limits, errores, respuestas parciales y datos antiguos.
- Si se requiere una API key privada, añadir un proxy/server function con secretos en entorno servidor; nunca exponerla en el navegador.
- Mostrar fuente y última actualización. No usar datos falsos como fallback silencioso.

### Fase 4 — Market Overview y listado
- Métricas globales que el proveedor permita obtener.
- Tabla de activos con búsqueda, ordenación y filtros simples.
- Loading skeleton, error con reintento, estado vacío y paginación/límite razonable.
- Verificar llamadas API y rendimiento con una lista larga.

### Fase 5 — detalle de activo y gráficos
- Ruta/panel por activo, precio y cambio por periodos.
- Gráfico histórico con selector de periodos soportados realmente por el proveedor.
- Tooltip accesible, ejes/formatos correctos y tratamiento de huecos de datos.
- Comprobar fechas, zona horaria y moneda de cotización.

### Fase 6 — watchlist
- Añadir/quitar favoritos, vista dedicada y persistencia local.
- Diseñar una pequeña capa de persistencia para no acoplar componentes a `localStorage`.
- Gestionar datos corruptos, migraciones simples y modo incógnito sin romper la app.

### Fase 7 — motor de cartera (lógica antes que UI)
- Definir transacciones de compra/venta, cantidades, precio de ejecución, fecha, moneda y comisiones.
- Elegir y documentar una política de coste medio para la vista informativa inicial; no llamarla cálculo fiscal oficial.
- Escribir funciones puras y pruebas para compras parciales, ventas, venta total, comisiones, decimales, saldo negativo e histórico vacío.
- Después construir formularios, resumen de valor, coste, P&L realizado/no realizado y asignación por activo.
- Guardado inicial local. No conectar wallet/exchange ni solicitar credenciales.

### Fase 8 — alertas útiles
- Primera versión: umbrales por activo evaluados cuando la app está abierta, con persistencia local y prevención de notificaciones repetidas.
- Si se requieren alertas 24/7, diseñar backend scheduler/worker, límites y canales de notificación como fase separada.
- Nunca prometer notificaciones cuando el dispositivo está cerrado si no existe servicio que las ejecute.

### Fase 9 — contexto y funciones de IA
- Añadir noticias solo con fuente, URL, fecha y licencia/condiciones de uso comprobadas.
- El asistente recibe únicamente los datos necesarios, distingue hechos de interpretación y enlaza las fuentes.
- Restringir el prompt: no inventar noticias/citas, no predecir con certeza ni emitir instrucciones personalizadas de inversión.
- Guardar claves del proveedor de IA en servidor. Poner límites de coste, tamaño y frecuencia antes de publicar.
- Lanzar esta fase después de que el seguimiento del mercado/cartera sea fiable.

### Fase 10 — calidad, privacidad y despliegue
- Ejecutar lint, build, tests, comprobación de enlaces/rutas y pruebas manuales de móvil/escritorio.
- Revisar accesibilidad, foco por teclado, contrastes, responsive, estados de red y errores de consola.
- Revisar bundle y secretos; añadir `.env.example` sin valores privados.
- Configurar despliegue, dominio, README útil y documentación de API/fuentes.
- Añadir analítica respetuosa con privacidad solo si se define qué evento se mide y para qué.

### Fase 11 — lanzamiento y validación
- Publicar una demo estable y un README con capturas, funciones, stack, limitaciones y roadmap.
- Pedir feedback a 5–10 personas que sigan criptomonedas y observar si completan tareas concretas.
- Medir: visitas a demo, usuarios que vuelven, activos guardados, carteras registradas, errores de API y feedback cualitativo.
- Corregir el mayor punto de fricción antes de añadir más funciones.

## Regla de avance entre fases
No se inicia una fase nueva hasta que la anterior tiene criterios de aceptación verificados. Mantener un único objetivo principal por tarea de Antigravity y revisar cada diff.
