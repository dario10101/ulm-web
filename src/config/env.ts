// Constante centralizada en vez de hardcodear la URL en cada servicio.
// Se puede sobreescribir con la variable de entorno VITE_API_BASE_URL.
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'
