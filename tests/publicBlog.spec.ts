import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import { resetAuthState } from '../src/composables/useAuth'
import { DEMO_BLOG_USERNAME } from '../src/data/blogDemo'
import { posts } from '../src/data/posts'
import PublicLayout from '../src/layouts/PublicLayout.vue'
import { publicRoutes } from '../src/router/routes/public.routes'
import { mockApi } from './helpers/fetchMock'

const Empty = defineComponent({ render: () => null })

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
  await flushPromises()
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

  it('el blog del dueño del ejemplo muestra el contenido quemado', async () => {
    mockApi({
      'GET /me': { status: 401 },
      [`GET /public/blogs/${DEMO_BLOG_USERNAME}`]: {
        status: 200,
        body: { username: DEMO_BLOG_USERNAME },
      },
    })

    const { wrapper } = await mountBlog(`/blog/${DEMO_BLOG_USERNAME}/writing`)

    expect(wrapper.text()).toContain(`@${DEMO_BLOG_USERNAME}`)
    expect(wrapper.text()).toContain(posts[0].title)
  })

  it('otro usuario ve sus secciones vacias, no el contenido del ejemplo', async () => {
    mockApi({
      'GET /me': { status: 401 },
      'GET /public/blogs/otra': { status: 200, body: { username: 'otra' } },
    })

    const { wrapper } = await mountBlog('/blog/otra/writing')

    expect(wrapper.text()).toContain('@otra')
    expect(wrapper.text()).toContain('Todavía no hay contenido')
    expect(wrapper.text()).not.toContain(posts[0].title)
  })

  it('un blog que no existe muestra el aviso y ninguna seccion', async () => {
    mockApi({ 'GET /me': { status: 401 }, 'GET /public/blogs/nadie': { status: 404 } })

    const { wrapper } = await mountBlog('/blog/nadie')

    expect(wrapper.text()).toContain('Este blog no existe')
    expect(wrapper.text()).not.toContain('Sobre mí')
  })

  it('normaliza la URL al username canonico', async () => {
    mockApi({
      'GET /me': { status: 401 },
      'GET /public/blogs/Otra': { status: 200, body: { username: 'otra' } },
      'GET /public/blogs/otra': { status: 200, body: { username: 'otra' } },
    })

    const { router } = await mountBlog('/blog/Otra/about')

    expect(router.currentRoute.value.fullPath).toBe('/blog/otra/about')
  })
})
