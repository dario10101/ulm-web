import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import { resetAuthState } from '../src/composables/useAuth'
import PublicLayout from '../src/layouts/PublicLayout.vue'
import { publicRoutes } from '../src/router/routes/public.routes'
import type { PublicBlog, PublicCollection, PublicItem } from '../src/types/blog'
import { mockApi } from './helpers/fetchMock'

const Empty = defineComponent({ render: () => null })

const BLOG: PublicBlog = {
  username: 'ruben',
  display_name: null,
  sections: [
    {
      slug: 'inicio',
      label: 'Bienvenida',
      type: 'home',
      content: {
        headline: 'Datos y código',
        intro: 'Hola **mundo**',
        highlights: [
          {
            kind: 'product',
            title: 'Plantillas',
            description: 'Para ULM',
            image_url: null,
            url: null,
          },
        ],
        cta: null,
      },
    },
    {
      slug: 'sobre-mi',
      label: 'Sobre mí',
      type: 'about',
      content: { photo_url: null, bio: 'Soy Data Engineer.', interests: ['Kickboxing'], links: [] },
    },
    {
      slug: 'perfil',
      label: 'Perfil profesional',
      type: 'professional',
      content: {
        headline: 'Data Engineer',
        summary: '',
        experience: [{ company: 'Acme', role: 'DE', start: '2022-03', end: null, description: '' }],
        education: [],
        skills: ['Python'],
        certifications: [],
        links: [],
      },
    },
    {
      slug: 'escritos',
      label: 'Escritos',
      type: 'collection',
      content: { intro: 'Notas.', layout: 'list', sort: 'date_desc' },
    },
    // Un tipo que el front no conoce no sale en el menu.
    { slug: 'galeria', label: 'Galería', type: 'gallery', content: {} },
  ],
}

const COLLECTION: PublicCollection = {
  section: { slug: 'escritos', label: 'Escritos' },
  groups: [
    {
      label: 'Datos',
      description: null,
      items: [
        {
          slug: 'pyspark',
          title: 'Notas de PySpark',
          date: '2026-07-18',
          excerpt: null,
          tags: ['PySpark'],
          cover_url: null,
        },
      ],
    },
  ],
  ungrouped: [
    {
      slug: 'kickboxing',
      title: 'Kickboxing',
      date: null,
      excerpt: null,
      tags: [],
      cover_url: null,
    },
  ],
}

const ITEM: PublicItem = {
  ...COLLECTION.groups[0].items[0],
  section: { slug: 'escritos', label: 'Escritos' },
  body_md: '# Ventanas\n\nTexto **importante** <script>alert(1)</script>',
}

function api(extra: Record<string, { status: number; body?: unknown }> = {}) {
  return mockApi({
    'GET /me': { status: 401 },
    'GET /public/blogs/ruben': { status: 200, body: BLOG },
    'GET /public/blogs/ruben/escritos/items': { status: 200, body: COLLECTION },
    'GET /public/blogs/ruben/escritos/items/pyspark': { status: 200, body: ITEM },
    ...extra,
  })
}

/** Las rutas publicas reales bajo /blog, con PublicLayout, en `path`. */
async function mountBlog(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/blog', component: PublicLayout, children: publicRoutes },
      { path: '/admin', name: 'admin-dashboard', component: Empty },
      { path: '/login', name: 'auth-login', component: Empty },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(RouterView, { global: { plugins: [router] } })
  // Rutas y vistas de seccion se cargan con import() diferido.
  for (let i = 0; i < 3; i++) {
    await vi.dynamicImportSettled()
    await flushPromises()
  }
  return { wrapper, router }
}

describe('sitio publico del blog', () => {
  beforeEach(() => resetAuthState())

  it('/blog sin usuario muestra la descripcion de la app y no consulta ningun blog', async () => {
    const fetch = mockApi({ 'GET /me': { status: 401 } })

    const { wrapper } = await mountBlog('/blog')

    expect(wrapper.text()).toContain('Un solo lugar para organizar tu vida')
    const urls = fetch.mock.calls.map(([url]) => url)
    expect(urls.some((url) => url.includes('/public/blogs'))).toBe(false)
  })

  it('el menu sale de las secciones habilitadas, con su label y en orden', async () => {
    api()

    const { wrapper } = await mountBlog('/blog/ruben/inicio')

    const nav = wrapper.find('nav#blog-sections')
    expect(nav.findAll('a').map((a) => a.text())).toEqual([
      'Bienvenida',
      'Sobre mí',
      'Perfil profesional',
      'Escritos',
    ])
    expect(nav.find('a').attributes('href')).toBe('/blog/ruben/inicio')
    expect(wrapper.text()).toContain('@ruben')
  })

  it('/blog/<usuario> redirige a la primera seccion', async () => {
    api()

    const { router } = await mountBlog('/blog/ruben')

    expect(router.currentRoute.value.fullPath).toBe('/blog/ruben/inicio')
  })

  it('un blog sin secciones lo dice', async () => {
    api({ 'GET /public/blogs/ruben': { status: 200, body: { ...BLOG, sections: [] } } })

    const { wrapper, router } = await mountBlog('/blog/ruben')

    expect(router.currentRoute.value.fullPath).toBe('/blog/ruben')
    expect(wrapper.text()).toContain('Este blog aún no tiene secciones')
  })

  it.each([
    ['inicio', ['Datos y código', 'mundo', 'Producto', 'Plantillas']],
    ['sobre-mi', ['Soy Data Engineer.', 'Kickboxing']],
    ['perfil', ['Data Engineer', 'DE · Acme', 'Actual', 'Python']],
  ])('la plantilla de /%s pinta su contenido', async (slug, texts) => {
    api()

    const { wrapper } = await mountBlog(`/blog/ruben/${slug}`)

    for (const text of texts) expect(wrapper.text()).toContain(text)
  })

  it('una seccion inexistente lo dice', async () => {
    api()

    const { wrapper } = await mountBlog('/blog/ruben/galeria')

    expect(wrapper.text()).toContain('Esta sección no existe')
  })

  it('una coleccion muestra sus subsecciones y los elementos sin subseccion', async () => {
    api()

    const { wrapper } = await mountBlog('/blog/ruben/escritos')

    expect(wrapper.text()).toContain('Notas.')
    expect(wrapper.text()).toContain('Datos')
    expect(wrapper.text()).toContain('Otros')
    const links = wrapper.findAll('main a').map((a) => a.attributes('href'))
    expect(links).toContain('/blog/ruben/escritos/pyspark')
    expect(links).toContain('/blog/ruben/escritos/kickboxing')
    // La seccion sigue marcada en el menu.
    expect(wrapper.find('nav#blog-sections a.text-foreground').text()).toBe('Escritos')
  })

  it('un elemento se renderiza sanitizado y vuelve a su seccion', async () => {
    api()

    const { wrapper } = await mountBlog('/blog/ruben/escritos/pyspark')

    const article = wrapper.find('article')
    expect(article.find('h1').text()).toBe('Notas de PySpark')
    expect(article.find('.markdown h1').text()).toBe('Ventanas')
    expect(article.find('.markdown strong').text()).toBe('importante')
    expect(article.find('script').exists()).toBe(false)
    expect(article.find('a').attributes('href')).toBe('/blog/ruben/escritos')
    expect(wrapper.find('nav#blog-sections a.text-foreground').text()).toBe('Escritos')
  })

  it('un elemento que no se puede ver lo dice', async () => {
    api()

    const { wrapper } = await mountBlog('/blog/ruben/escritos/borrador')

    expect(wrapper.text()).toContain('No se encontró el artículo')
  })

  it('un blog que no existe muestra el aviso y ninguna seccion', async () => {
    mockApi({ 'GET /me': { status: 401 }, 'GET /public/blogs/nadie': { status: 404 } })

    const { wrapper } = await mountBlog('/blog/nadie')

    expect(wrapper.text()).toContain('Este blog no existe')
    expect(wrapper.find('nav#blog-sections').exists()).toBe(false)
  })

  it('normaliza la URL al username canonico sin volver a pedir el blog', async () => {
    const fetch = api({ 'GET /public/blogs/Ruben': { status: 200, body: BLOG } })

    const { router } = await mountBlog('/blog/Ruben/sobre-mi')

    expect(router.currentRoute.value.fullPath).toBe('/blog/ruben/sobre-mi')
    const blogCalls = fetch.mock.calls.filter(([url]) => /\/public\/blogs\/[^/]+$/.test(url))
    expect(blogCalls).toHaveLength(1)
  })

  it('en movil el menu se abre con un boton', async () => {
    api()

    const { wrapper } = await mountBlog('/blog/ruben/inicio')

    const nav = wrapper.find('nav#blog-sections')
    const button = wrapper.find('button[aria-controls="blog-sections"]')
    expect(nav.classes()).toContain('hidden')
    await button.trigger('click')
    expect(nav.classes()).toContain('flex')
    expect(button.attributes('aria-expanded')).toBe('true')
  })
})
