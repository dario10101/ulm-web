# ULM Web

Frontend de ULM (gestion personal: habitos, finanzas, contenido). Consume la API de `ulm-core`.

**Stack**: Vue 3 (Composition API + `<script setup>`) + TypeScript, Vite, Vue Router, Tailwind CSS, Vitest + Vue Test Utils.

**Estructura**: `src/views` (paginas, por admin/public/auth), `src/layouts` (AppShellLayout privado, PublicLayout, AuthLayout), `src/components/ui` y `src/components/layout`, `src/router`, `tests/` (vitest). Habla con `ulm-core` por el proxy de Vite (`/api`, mismo origen).

**Auth**: cookie de sesion (la maneja el backend). `useAuth` (usuario de `/me`), `router/authGuard.ts` (`meta.requiresAuth` en `/admin`, 401 global via `setUnauthorizedHandler` de `lib/http`). Nada de tokens en JS ni `localStorage`. Permisos (`src/config/permissions.ts`): `meta.permission` en rutas (lista = cualquiera de), `permission` en items de `nav.ts`/`recordTypes`/`analyticsTypes`, `useAuth().can()`. Solo UX: el backend responde 403.

**Idioma de UI**: `/blog/**` (sitio publico) esta en espanol. `/admin/**` y `/login/**` estan en ingles. El `lang` del `<html>` se actualiza por layout (`PublicLayout` pone `es`, `AppShellLayout`/`AuthLayout` ponen `en`).

Estilo: ver STYLEGUIDE.md (codigo en ingles, comentarios/logs en espanol).
