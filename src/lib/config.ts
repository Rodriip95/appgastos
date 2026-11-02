// Preferencias regionales de la app. Cambiar aquí si se usa otra moneda/país.
export const APP_LOCALE = "es-AR";
export const APP_CURRENCY = "ARS";
export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

// Dólar de referencia para el equivalente en pesos de los movimientos en USD
// (casas de dolarapi.com: oficial, blue, bolsa, contadoconliqui, tarjeta, mayorista, cripto).
// Es el valor por defecto: cada persona puede elegir otro en la home (USD_REFERENCE_OPTIONS).
export const USD_REFERENCE = "oficial";
export const USD_REFERENCE_OPTIONS = ["oficial", "bolsa", "blue"] as const;
// Consumos en dólares de una tarjeta: si se pagan en pesos, el banco cobra al dólar tarjeta.
export const USD_CARD_REFERENCE = "tarjeta";
