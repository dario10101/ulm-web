import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import { resetAuthState } from '../../src/composables/useAuth'
import { adminRoutes } from '../../src/router/routes/admin.routes'
import type { AdminSection, BlogItem, BlogSettings } from '../../src/types/blogAdmin'
import type { Me } from '../../src/types/user'
import { ME_ALL } from './fetchMock'

export const OWNER: Me = { ...ME_ALL, username: 'ruben' }

export const SETTINGS: BlogSettings = {
  enabled: true,
  display_name: null,
  max_enabled_sections: 2,
  max_sections: 20,
  section_types: [
    {
      type: 'home',
      singleton: true,
      has_items: false,
      default_label: 'Inicio',
      default_slug: 'inicio',
    },
    {
      type: 'about',
      singleton: true,
      has_items: false,
      default_label: 'Sobre mí',
      default_slug: 'sobre-mi',
    },
    {
      type: 'collection',
      singleton: false,
      has_items: true,
      default_label: 'Proyectos',
      default_slug: null,
    },
  ],
  link_types: [
    {
      type: 'email',
      label: 'Email',
      category: 'contact',
      kind: 'email',
      domains: [],
      requires_label: false,
      sensitive: true,
      placeholder: 'you@example.com',
    },
    {
      type: 'github',
      label: 'GitHub',
      category: 'professional',
      kind: 'url',
      domains: ['github.com'],
      requires_label: false,
      sensitive: false,
      placeholder: 'https://github.com/username',
    },
    {
      type: 'website',
      label: 'Sitio web',
      category: 'web',
      kind: 'url',
      domains: [],
      requires_label: true,
      sensitive: false,
      placeholder: 'https://mysite.com',
    },
  ],
  link_categories: ['contact', 'professional', 'social', 'shop', 'support', 'web'],
  max_links_per_type: 5,
}

const stamp = { created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' }

export const HOME: AdminSection = {
  id: 'home',
  type: 'home',
  label: 'Bienvenida',
  slug: 'inicio',
  position: 0,
  enabled: true,
  content: { headline: 'Hola', intro: '', highlights: [] },
  links: { inline: [], end: [] },
  ...stamp,
}

export const ABOUT: AdminSection = {
  id: 'about',
  type: 'about',
  label: 'Sobre mí',
  slug: 'sobre-mi',
  position: 1,
  enabled: true,
  content: { photo_url: null, bio: 'Soy yo', interests: [], links: [] },
  links: { inline: [], end: [] },
  ...stamp,
}

export const BOOKS: AdminSection = {
  id: 'BOOKS',
  type: 'collection',
  label: 'Libros',
  slug: 'libros',
  position: 2,
  enabled: false,
  content: { intro: '', layout: 'list', sort: 'date_desc' },
  links: { inline: [], end: [] },
  ...stamp,
}

export function item(id: string, extra: Partial<BlogItem> = {}): BlogItem {
  return {
    id,
    section_id: 'BOOKS',
    slug: id.toLowerCase(),
    title: `Item ${id}`,
    date: null,
    excerpt: null,
    tags: [],
    cover_url: null,
    group_id: null,
    status: 'draft',
    position: null,
    size_bytes: 10,
    original_filename: `${id}.md`,
    ...stamp,
    ...extra,
  }
}

const Empty = defineComponent({ render: () => null })

/** Las rutas reales de /admin (y los links al blog publico) en `path`. */
export async function mountAdmin(path: string, me: Me = OWNER) {
  resetAuthState(me)
  expandBlocks()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', children: adminRoutes },
      { path: '/blog/:username', name: 'blog-home', component: Empty },
      { path: '/blog/:username/:section', name: 'blog-section', component: Empty },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(RouterView, { global: { plugins: [router] }, attachTo: document.body })
  await settle()
  return { wrapper, router }
}

/** Los bloques del admin arrancan contraidos (useCollapsed): los tests los
 * abren para llegar a sus campos. */
export const BLOCK_KEYS = [
  'blog.settings',
  'blog.sections',
  'blog.links',
  'blog-section.menu',
  'blog-section.content',
  'blog-section.links',
  'blog-section.groups',
  'blog-section.items',
]

export function expandBlocks() {
  for (const key of BLOCK_KEYS) localStorage.setItem(`ulm.collapsed.${key}`, 'false')
}

/** Rutas y formularios se cargan con import() diferido. */
export async function settle() {
  for (let i = 0; i < 3; i++) {
    await vi.dynamicImportSettled()
    await flushPromises()
  }
}

/** Cuerpo JSON del ultimo request a "METODO /ruta". */
export function lastBody(fetch: ReturnType<typeof vi.fn>, method: string, path: string) {
  const call = fetch.mock.calls
    .filter(([url, init]) => (init?.method ?? 'GET') === method && url.split('?')[0].endsWith(path))
    .at(-1)
  return call ? JSON.parse(call[1].body as string) : undefined
}
