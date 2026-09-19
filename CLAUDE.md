# ULM Web

Frontend de ULM (gestion personal: habitos, finanzas, contenido). Consume la API de `ulm-core`.

**Stack**: Vue 3 (Composition API + `<script setup>`) + TypeScript, Vite, Vue Router, Tailwind CSS, Vitest + Vue Test Utils.

**Estructura**: `src/views` (paginas, por admin/public/auth), `src/layouts` (AppShellLayout privado, PublicLayout, AuthLayout), `src/components/ui` y `src/components/layout`, `src/router`, `tests/` (vitest). Sin conexion real a `ulm-core` todavia (prototipo navegable).

**Idioma de UI**: `/blog/**` (sitio publico) esta en espanol. `/admin/**` y `/login/**` estan en ingles. El `lang` del `<html>` se actualiza por layout (`PublicLayout` pone `es`, `AppShellLayout`/`AuthLayout` ponen `en`).

Estilo: ver STYLEGUIDE.md (codigo en ingles, comentarios/logs en espanol).
