# Guia de estilo - ULM Web

## Idioma

- Codigo (variables, funciones, componentes, archivos, carpetas): **ingles**.
- Comentarios, logs y mensajes de commit: **espanol**.

## Estructura y nombres

- Carpetas en `kebab-case` o `camelCase` segun convencion de Vite (`src/components`, etc).
- Componentes Vue en `PascalCase.vue` (ej. `HabitList.vue`).
- Variables y funciones en `camelCase`.
- Un componente por archivo, con responsabilidad unica.

## Convenciones de codigo

- Usar Composition API con `<script setup>` en todo componente nuevo.
- Evitar logica de negocio dentro de componentes; extraer a composables cuando crezca.
- Manejar siempre el estado de carga y error al consumir la API (`loading`, `error`).
- No hardcodear URLs de API fuera de una constante o variable de entorno.

## Comentarios y logs

- Comentar el "por que", no el "que".
- Mensajes de error visibles al usuario en espanol.

## Commits

- Mensajes cortos, en espanol, en modo imperativo: `agrega vista de habitos`, `corrige estilo de boton`.

## Pruebas

- Todo componente con logica (fetch, condicionales, computed) debe tener prueba en `tests/`.
- Ejecutar `npm run test` antes de cada commit.
