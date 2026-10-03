// Constante centralizada en vez de hardcodear la URL en cada servicio.
// Relativa a proposito: en desarrollo la sirve el proxy de Vite (ver
// vite.config.ts) y en produccion el mismo dominio. Se puede sobreescribir
// con VITE_API_BASE_URL.
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
