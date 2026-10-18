import type { PriceAlert } from "../types/crypto";
import { formatCurrency } from "../utils/formatters.ts";

/**
 * Obtiene el constructor Notification disponible de forma isomórfica.
 */
const getNotificationConstructor = (): typeof Notification | null => {
  if (typeof window !== "undefined" && "Notification" in window) {
    return window.Notification;
  }
  if (typeof globalThis !== "undefined" && "Notification" in globalThis) {
    return (globalThis as unknown as { Notification: typeof Notification }).Notification;
  }
  return null;
};

/**
 * Comprueba si la API de Notification del navegador está soportada en el entorno actual.
 */
export const isBrowserNotificationSupported = (): boolean => {
  return getNotificationConstructor() !== null;
};

/**
 * Devuelve el estado actual de permisos de notificación del navegador.
 */
export const getBrowserNotificationPermission = (): NotificationPermission => {
  const NotificationConstructor = getNotificationConstructor();
  if (!NotificationConstructor) {
    return "denied";
  }
  return NotificationConstructor.permission;
};

/**
 * Solicita explícitamente permiso al usuario para enviar notificaciones de escritorio.
 * Debe invocarse únicamente como respuesta a una acción directa del usuario (clic en botón/toggle).
 */
export const requestBrowserNotificationPermission = async (): Promise<NotificationPermission> => {
  const NotificationConstructor = getNotificationConstructor();
  if (!NotificationConstructor) {
    return "denied";
  }

  try {
    const permission = await NotificationConstructor.requestPermission();
    return permission;
  } catch (err) {
    console.warn("Error al solicitar permisos de notificación del navegador:", err);
    return "denied";
  }
};

/**
 * Emite una notificación de escritorio para una alerta disparada si hay permisos concedidos.
 * En caso de fallo o bloqueo del sistema operativo, captura el error de forma segura
 * sin corromper el estado contable de las alertas.
 */
export const sendBrowserNotification = (alert: PriceAlert): boolean => {
  const NotificationConstructor = getNotificationConstructor();
  if (!NotificationConstructor || NotificationConstructor.permission !== "granted") {
    return false;
  }

  try {
    const conditionText = alert.condition === "gte" ? "alcanzó o superó" : "cayó a o por debajo de";
    const title = `🚨 Alerta: ${alert.coinName} (${alert.coinSymbol.toUpperCase()})`;
    const targetFormatted = formatCurrency(alert.targetPrice, alert.currency.toUpperCase());
    const observedFormatted =
      alert.triggeredPrice !== undefined
        ? formatCurrency(alert.triggeredPrice, alert.currency.toUpperCase())
        : targetFormatted;

    const body = `${alert.coinName} ${conditionText} ${targetFormatted}. Cotización observada: ${observedFormatted}.`;

    const notification = new NotificationConstructor(title, {
      body,
      icon: alert.coinImage || "/favicon.ico",
      tag: `alert-${alert.id}-${alert.triggeredAt || Date.now()}`,
    });

    if (typeof window !== "undefined") {
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    return true;
  } catch (err) {
    // Garantiza que un fallo de notificación no rompa la aplicación ni impida el registro
    console.warn("No se pudo mostrar la notificación de escritorio:", err);
    return false;
  }
};
