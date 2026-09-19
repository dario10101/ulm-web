# ULM Web (Frontend)

Frontend de **Unified Life Manager (ULM)**, una aplicacion personal de gestion diaria: habitos, finanzas y publicacion de contenido.

## Funcionalidad

Esqueleto navegable (sidebar + topbar del area privada, sitio publico /blog, flujo de login) conectado a `ulm-core` para las siguientes secciones:

- **Records → Weight**: alta y listado paginado con filtro de fechas (edicion/borrado aun no conectados).
- **Checklist**: seccion completa.
  - `/admin/checklists`: checklist de la semana en curso, organizado por pestanas de dia y columnas por categoria. Cada tarea se marca como completada o no lograda con un tap (resaltado verde/rojo), y si no hay semana creada permite generarla a partir del template eligiendo el rango de fechas. Incluye boton para cerrar la semana en curso.
  - `/admin/checklists/categories`: alta, edicion, reordenamiento y borrado de categorias (guardado en bloque con Guardar/Cancelar).
  - `/admin/checklists/template`: template semanal fijo por dia y categoria, con tareas de alta/estandar prioridad que pueden aplicarse a varios dias a la vez.

El resto de las secciones del admin (Dashboard, Calendar, Analytics, etc.) siguen siendo prototipos de navegacion sin datos reales.

## Stack tecnico

- **Framework**: Vue 3 (Composition API, `<script setup>`) + TypeScript
- **Build tool**: Vite
- **Routing**: Vue Router 4 (rutas por grupo: `/blog` publico, `/admin` privado, `/login` auth)
- **Estilos**: Tailwind CSS
- **Iconos**: `@lucide/vue`
- **Testing**: Vitest + Vue Test Utils + jsdom

## Estructura

```
src/
  components/ui/      # Primitivas visuales (BaseButton, BaseCard, EmptyState...)
  components/layout/  # Sidebar, topbar, menu de usuario, panel de filtros
  layouts/            # AppShellLayout (privado), PublicLayout, AuthLayout
  views/              # Paginas, agrupadas por admin/public/auth
  router/             # Definicion de rutas por grupo
  config/nav.ts        # Items del sidebar
  composables/        # Estado compartido de la app shell
  data/                # Contenido de ejemplo (posts del blog)
  lib/                 # Utilidades puras (ej. grid de calendario)
tests/                 # Pruebas unitarias (vitest)
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
