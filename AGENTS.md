# My Crypto 2.0 — reglas permanentes para Antigravity

## Objetivo del producto
Construimos una terminal de investigación y seguimiento de criptomonedas para inversores particulares. Debe ayudar a entender el mercado y la propia cartera con datos trazables, buena visualización y cálculos fiables. No es un bot de trading ni un asesor financiero personalizado.

## Regla 0: entender antes de modificar
- Antes de editar, inspecciona el repositorio real: `package.json`, configuración, `src/`, dependencias, llamadas de red, estado, estilos y scripts.
- No asumas que la documentación existente está actualizada. Contrasta el README con el código.
- No reescribas ni migres el proyecto entero por preferencia. Conserva lo que funcione y explica cualquier migración propuesta antes de hacerla.
- Trabaja por cambios pequeños, verificables y reversibles. No desarrolles varias fases a la vez.
- Si falta una decisión de producto o arquitectura que pueda cambiar mucho el trabajo, pregunta o presenta opciones antes de continuar.

## Calidad técnica
- Respeta las versiones y convenciones que ya existan, salvo que haya una razón documentada para cambiar.
- Usa TypeScript de forma estricta; evita `any` y los casts sin justificación.
- Separa presentación, lógica de dominio, estado y acceso a datos. Los componentes visuales no deben llamar directamente a proveedores externos.
- Define tipos explícitos para respuestas externas y valida en runtime las entradas de red en puntos críticos.
- Centraliza formatos de moneda, porcentajes, fechas y unidades. No dupliques lógica financiera entre componentes.
- Las funciones de cálculo de cartera deben ser puras y tener pruebas unitarias.
- Mantén estados de carga, vacío, error, datos antiguos y reintento; nunca conviertas un fallo de la API en datos falsos.
- No añadas dependencias por comodidad sin explicar por qué son necesarias.

## Datos de mercado y seguridad
- Verifica la documentación actual del proveedor antes de implementar endpoints, parámetros, límites o campos.
- Encapsula el proveedor en una capa/adapter para poder cambiar de proveedor sin rehacer la UI.
- Muestra la moneda de cotización, la fuente de los datos y la hora de última actualización cuando sea relevante.
- Respeta rate limits; usa caché, deduplicación, cancelación de solicitudes y reintentos limitados cuando corresponda.
- Nunca guardes API keys privadas, secretos o credenciales en el cliente ni los incluyas en commits. Usa variables de entorno y un backend/proxy cuando se necesite un secreto.
- No solicites frases semilla, claves privadas ni credenciales de exchanges. La primera versión de cartera será manual y no custodial.
- No inventes noticias, precios, rentabilidades ni análisis. Los datos ficticios solo se admiten en modo demo claramente etiquetado.

## Enfoque financiero responsable
- La app informa, calcula y explica; no promete rentabilidad ni presenta predicciones como hechos.
- No generes órdenes ni ejecutes operaciones.
- Diferencia claramente datos de mercado, cálculos de la app y texto generado por IA.
- Los resúmenes generados por IA deben indicar sus fuentes/fecha de los datos y reconocer incertidumbre. No los redactes como recomendaciones personalizadas de compra o venta.
- Documenta el método de coste utilizado para calcular ganancias y pérdidas. No presentes los cálculos como asesoramiento fiscal.

## Flujo obligatorio de trabajo
1. Resume el objetivo y los criterios de aceptación de la tarea.
2. Identifica archivos que vas a leer/modificar y el motivo.
3. Implementa solo el alcance acordado.
4. Ejecuta las comprobaciones disponibles: lint, build y tests pertinentes.
5. Revisa el diff buscando errores, duplicados, secretos, regresiones y estados de error ausentes.
6. Informa de archivos cambiados, decisiones, pruebas ejecutadas y limitaciones pendientes.

## Criterios de terminado
Una tarea no está terminada solo porque la interfaz se vea bien. Debe cumplir el comportamiento solicitado, manejar errores y estados vacíos, funcionar en móvil y escritorio, pasar las comprobaciones disponibles y no introducir datos inventados ni secretos.
