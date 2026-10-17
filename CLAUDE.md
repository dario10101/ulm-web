# ULM Web

Frontend de ULM (gestion personal: habitos, finanzas, contenido). Consume la API de `ulm-core`.

**Stack**: Vue 3 (Composition API + `<script setup>`) + TypeScript, Vite, Vue Router, Tailwind CSS, Vitest + Vue Test Utils.

**Estructura**: `src/views` (paginas, por admin/public/auth), `src/layouts` (AppShellLayout privado, PublicLayout, AuthLayout), `src/components/ui` y `src/components/layout`, `src/router`, `tests/` (vitest). Habla con `ulm-core` por el proxy de Vite (`/api`, mismo origen).

**Auth**: cookie de sesion (la maneja el backend). `useAuth` (usuario de `/me`), `router/authGuard.ts` (`meta.requiresAuth` en `/admin`, 401 global via `setUnauthorizedHandler` de `lib/http`). Nada de tokens en JS ni `localStorage`. Permisos (`src/config/permissions.ts`): `meta.permission` en rutas (lista = cualquiera de), `permission` en items de `nav.ts`/`recordTypes`/`analyticsTypes`, `useAuth().can()`. Solo UX: el backend responde 403.

**Tema**: claro/oscuro por dispositivo (`useTheme`, localStorage + script inline en `index.html`). Los colores son variables CSS (`src/style.css`, canales RGB) mapeadas en `tailwind.config.js`: no usar hex fijos; la paleta por defecto de Tailwind necesita par claro/oscuro (`text-rose-600 dark:text-rose-400`).

**Parametros**: paneles con URL propia en `/admin/settings/<section>` (System = solo admin; ahi vive `users`, la administracion de usuarios y sus permisos por dominio) y `/admin/records/<type>/<panel>` (ver `config/paramPanels.ts`).

**Blog publico**: `/blog` = landing; `/blog/:username/:section/:item?` con slugs dinamicos (`PublicLayout` resuelve el blog en un request y lo provee con `useBlogOwner`). Cada tipo de seccion tiene su vista en `views/public/blog/`, registrada en `config/blogSectionTypes.ts` (tipo nuevo = componente + 1 linea). Markdown: solo con `MarkdownContent.vue` (unico `v-html`, sobre `lib/markdown.ts`: markdown-it sin HTML + DOMPurify). `users.username` se crea en Settings -> General (inmutable).

**Admin del blog**: `/admin/blog` (resumen) y `/admin/blog/sections/:id` (editor). Formulario por tipo de seccion en `components/blog-admin/forms/`, registrado en `config/blogSectionEditors.ts` (tipo nuevo = formulario + 1 linea); estado comun en `useSectionContentForm`. Subidas multipart con `postForm` (`lib/http`).

**Idioma de UI**: `/blog/**` (sitio publico) esta en espanol. `/admin/**` y `/login/**` estan en ingles. El `lang` del `<html>` se actualiza por layout (`PublicLayout` pone `es`, `AppShellLayout`/`AuthLayout` ponen `en`).

Estilo: ver STYLEGUIDE.md (codigo en ingles, comentarios/logs en espanol).
