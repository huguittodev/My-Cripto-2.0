# 🪙 Crypto Pulse Live

**Crypto Pulse Live** es un dashboard en tiempo real construido con **React**, **TypeScript** y **Tailwind CSS**. Esta aplicación permite monitorear los precios actuales de las criptomonedas más importantes del mercado utilizando la API pública de CoinGecko.

---

## 🚀 Características

- **Datos en Tiempo Real:** Conexión directa con la API de CoinGecko (v3) para obtener precios actualizados al instante.
- **Búsqueda Personalizada:** El usuario puede definir exactamente cuántas criptomonedas desea visualizar en pantalla.
- **Diseño Responsive:** Interfaz moderna, oscura y minimalista, optimizada para dispositivos móviles, tablets y escritorio.
- **Arquitectura Modular:** Separación clara de responsabilidades mediante componentes, servicios y tipos.
- **TypeScript Estricto:** Implementación de interfaces y tipos para garantizar la seguridad y el autocompletado del código.

## 🛠️ Stack Tecnológico

| Tecnología       | Uso                                                                     |
| :--------------- | :---------------------------------------------------------------------- |
| **React 18**     | Biblioteca principal para la construcción de la interfaz de usuario.    |
| **Vite**         | Herramienta de construcción (build tool) de última generación.          |
| **TypeScript**   | Lenguaje para añadir tipado estático y mejorar la mantenibilidad.       |
| **Tailwind CSS** | Framework de CSS basado en utilidades para un diseño rápido y flexible. |
| **pnpm**         | Gestor de paquetes eficiente y rápido.                                  |
| **WSL2**         | Entorno de desarrollo Linux (Ubuntu) sobre Windows.                     |

## 📦 Instalación y Configuración

1.  **Clonar el proyecto:**

    ```bash
    git clone [https://github.com/tu-usuario/mi-crypto.git](https://github.com/tu-usuario/mi-crypto.git)
    cd mi-crypto
    ```

2.  **Instalar dependencias:**

    ```bash
    pnpm install
    ```

3.  **Configurar Tailwind CSS:**

    ```bash
    pnpm dlx tailwindcss init -p
    ```

4.  **Ejecutar en modo desarrollo:**
    ```bash
    pnpm dev
    ```

## 📂 Estructura de Carpetas

```text
src/
 ├── components/      # Componentes UI (ej: CoinCard.tsx)
 ├── services/        # Funciones de llamada a la API (api.ts)
 ├── types/           # Definición de contratos de datos (crypto.d.ts)
 ├── App.tsx          # Lógica principal, estado y composición
 ├── main.tsx         # Punto de entrada de la aplicación
 └── index.css        # Directivas globales de Tailwind CSS
```

# 🪙 Crypto Pulse Live

> 🚀 **Demo en vivo:** [https://mi-crypto.vercel.app/]
