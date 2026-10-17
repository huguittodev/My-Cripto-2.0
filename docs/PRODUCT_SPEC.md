# My Crypto 2.0 — product brief

## Visión
Una terminal clara para inversores particulares que quieren seguir el mercado, entender qué ocurre con los activos que vigilan y medir cómo evoluciona su cartera sin saltar entre diez pestañas.

## Posicionamiento
**Mercado + cartera + contexto explicable**, no otro dashboard bonito ni un bot que prometa predecir precios.

## Usuario inicial
Inversor particular que sigue varias criptomonedas, consulta precios con frecuencia y quiere conocer el valor de su cartera, el beneficio/pérdida y los movimientos relevantes. La primera versión debe ser útil sin conectar una cuenta de exchange ni una wallet.

## Principios
- Datos reales, con fuente y fecha/hora cuando sea posible.
- Moneda de visualización explícita (por ejemplo, EUR o USD).
- Interfaz rápida, accesible, responsive y visualmente memorable.
- Cálculos financieros comprobables y documentados.
- Privacidad por defecto: no pedir claves privadas ni acceso a exchanges.
- La IA explica datos disponibles; no inventa hechos ni da señales de compra/venta.

## Alcance recomendado del MVP público
1. **Market overview:** capitalización total y métricas disponibles del proveedor, activos destacados, mayores subidas/bajadas y volumen.
2. **Mercados:** tabla/listado con búsqueda, ordenación, filtros básicos, precio, variación, capitalización y volumen cuando el proveedor aporte los campos.
3. **Detalle de activo:** precio, variaciones por periodo y gráfico histórico con rangos disponibles, con estados de carga/error y marca de última actualización.
4. **Watchlist:** favoritos persistidos en el navegador, con posibilidad de añadir/quitar activos y verlos juntos.
5. **Mi cartera (manual):** registro de compras/ventas, unidades, precio de ejecución y comisiones opcionales; valor actual, coste, asignación y P&L realizado/no realizado.
6. **Responsive + accesibilidad:** uso real en móvil/desktop, teclado, contraste, estados de foco y formatos legibles.
7. **Transparencia:** atribución del proveedor y aviso visible de que es una herramienta informativa, no asesoramiento financiero ni fiscal.

## Funciones posteriores, no bloqueantes para el MVP
- Alertas de precio persistentes con notificación de servidor/email/push. Primera iteración posible: alertas locales mientras la aplicación está abierta.
- Registro de noticias y eventos con fuentes verificables.
- Asistente de IA que resuma datos y noticias elegidas, siempre con referencias, fecha y límites claros.
- Cuentas y sincronización en la nube para watchlist/cartera.
- Importación CSV de operaciones.
- Comparación de activos y métricas avanzadas.
- Integraciones de wallet/exchange de solo lectura, únicamente después de diseñar un modelo de seguridad y permisos; nunca pedir claves privadas.

## Fuera de alcance inicial
- Trading automático o firma de transacciones.
- Predicción de precios presentada como fiable.
- Copiar operaciones de otros usuarios.
- Conectar claves privadas/seed phrases.
- Microservicios, blockchain propia o arquitectura compleja antes de validar uso.
- Suscripciones/pagos antes de comprobar que la gente vuelve a utilizar el producto.

## Criterios de aceptación del MVP
- El dashboard carga datos reales, identifica claramente la fuente y muestra cuándo se actualizaron.
- Búsqueda, ordenación, filtros y navegación al detalle funcionan; los fallos de red se muestran de forma útil.
- Watchlist persiste tras recargar.
- Las operaciones de cartera generan saldos y P&L correctos para compras, ventas, comisiones y decimales; hay pruebas automatizadas para casos normales y extremos.
- Los datos de cartera y los de mercado usan monedas compatibles; cualquier conversión se declara explícitamente.
- No hay secretos en el bundle, el repositorio ni el historial de Git.
- `lint`, `build` y tests pasan; se prueba al menos una vez en móvil y escritorio.
- No se presenta un precio antiguo como dato en tiempo real sin indicarlo.
