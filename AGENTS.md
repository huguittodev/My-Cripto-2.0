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


## Sistema de diseño visual (SaaS Azul) y tokens de Tailwind
La interfaz de My Crypto 2.0 sigue una estética de terminal SaaS azul técnico, oscuro y premium. La configuración de Tailwind (`tailwind.config.js`) es la **única fuente de verdad** de la paleta.

### Reglas de convención visual
1. **Definición única:** Todos los colores se declaran en `theme.extend.colors.crypto` en `tailwind.config.js`.
2. **Consumo semántico en componentes:** Los componentes deben usar exclusivamente las clases semánticas `crypto.*` (ej. `bg-crypto-bg`, `bg-crypto-surface`, `bg-crypto-primary`, `text-crypto-text`, etc.). No usar valores hexadecimales arbitrarios ni clases ad-hoc.
3. **Estilos globales limpios:** `src/index.css` no duplica colores ni define una paleta paralela; consume las directivas base de Tailwind.
4. **Separación de marca vs finanzas:** El azul (`crypto.primary`, `crypto.accent`) es para marca, acciones y selecciones. El verde (`crypto.positive`) y el rojo (`crypto.negative`) se reservan estrictamente para variaciones y estados financieros, nunca como color de adorno.
5. **Nuevos componentes:** Todo nuevo componente creado debe ceñirse a estos mismos tokens.

### Paleta de tokens predefinida
| Token | Valor Hex | Propósito | Clases Tailwind principales |
|---|---|---|---|
| `crypto.bg` | `#0B1020` | Fondo general de la terminal | `bg-crypto-bg` |
| `crypto.surface` | `#111A2E` | Tarjetas, paneles y contenedores | `bg-crypto-surface` |
| `crypto.surface-hover` | `#18243B` | Superficies interactivas y hover | `bg-crypto-surface-hover`, `hover:bg-crypto-surface-hover` |
| `crypto.surface-raised` | `#1C2942` | Menús, inputs y elementos elevados | `bg-crypto-surface-raised` |
| `crypto.border` | `#293750` | Bordes y separadores sutiles | `border-crypto-border` |
| `crypto.primary` | `#3B82F6` | Marca azul, botones principales | `bg-crypto-primary`, `border-crypto-primary` |
| `crypto.primary-hover` | `#2563EB` | Hover de botones y acciones primarias | `hover:bg-crypto-primary-hover` |
| `crypto.primary-soft` | `#172D50` | Fondos azules tenues de selección | `bg-crypto-primary-soft` |
| `crypto.accent` | `#60A5FA` | Enlaces, detalles y estados activos | `text-crypto-accent` |
| `crypto.accent-strong` | `#93C5FD` | Acento destacado sobre fondo oscuro | `text-crypto-accent-strong` |
| `crypto.text` | `#F1F5F9` | Texto principal de máxima legibilidad | `text-crypto-text` |
| `crypto.text-secondary`| `#A7B4C8` | Subtítulos y textos secundarios | `text-crypto-text-secondary` |
| `crypto.text-muted` | `#77869F` | Metadatos, etiquetas y cifras discretas | `text-crypto-text-muted` |
| `crypto.positive` | `#22C55E` | Variaciones positivas (+24h) | `text-crypto-positive`, `bg-crypto-positive-soft` |
| `crypto.negative` | `#F87171` | Variaciones negativas (-24h) | `text-crypto-negative`, `bg-crypto-negative-soft` |
| `crypto.warning` | `#FBBF24` | Avisos y alertas moderadas | `text-crypto-warning` |
| `crypto.info` | `#38BDF8` | Información de estado | `text-crypto-info` |

# Comentarios
Siempre añadir comentarios en el código para explicar el funcionamiento del mismo. Si es muy largo, añadir comentarios en cada función. y solo comentarios que sean necesarios sin llenar todo el código de comentarios y si el comentario ocupa solo una linea añadir con // y no con /* * */ si son varias lineas usar /* * */.


