# ULM Web (Frontend)

Frontend de **Unified Life Manager (ULM)**, una aplicacion personal de gestion diaria: habitos, finanzas y publicacion de contenido.

## Funcionalidad

Interfaz web que consume la API de `ulm-core`. Estado actual: esqueleto funcional con una vista dummy que lista habitos (usa datos de ejemplo si el backend no esta disponible).

## Stack tecnico

- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **Build tool**: Vite
- **Testing**: Vitest + Vue Test Utils + jsdom
- **Consumo de API**: `fetch` nativo contra `ulm-core` (`http://127.0.0.1:8000`)

## Estructura

```
src/
  components/   # Componentes Vue reutilizables
  App.vue       # Componente raiz
  main.js       # Punto de entrada
tests/          # Pruebas unitarias (vitest)
```

## Guia de instalacion

1. Instalar dependencias:
   ```
   npm install
   ```
2. Levantar el servidor de desarrollo:
   ```
   npm run dev
   ```
   Por defecto disponible en `http://localhost:5173`
3. Para que la vista de habitos muestre datos reales, levantar tambien `ulm-core` en `http://127.0.0.1:8000`.

## Correr pruebas

```
npm run test
```

## Build de produccion

```
npm run build
```

## Estilo de desarrollo

Ver [STYLEGUIDE.md](./STYLEGUIDE.md).
