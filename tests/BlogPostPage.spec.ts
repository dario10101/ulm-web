import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { blogOwnerKey, type BlogOwner } from '../src/composables/useBlogOwner'
import { DEMO_BLOG_USERNAME } from '../src/data/blogDemo'
import { posts } from '../src/data/posts'
import BlogPostPage from '../src/views/public/BlogPostPage.vue'

// RouterLink se usa dentro del componente (breadcrumb "Volver a escritos"),
// asi que montamos con un router real minimo en vez de mockear todo.
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/blog/:username/writing',
      name: 'blog-writing',
      component: { template: '<div />' },
    },
  ],
})

// El link de vuelta no pasa el username: vue-router reusa el de la ruta
// actual, asi que hay que estar dentro de un blog.
router.push(`/blog/${DEMO_BLOG_USERNAME}/writing`)

async function mountPost(slug: string, owner: BlogOwner) {
  await router.isReady()
  return mount(BlogPostPage, {
    props: { slug },
    global: {
      plugins: [router],
      // Lo que provee PublicLayout tras resolver el blog contra la API.
      provide: { [blogOwnerKey as symbol]: computed(() => owner) },
    },
  })
}

const demoOwner = { username: DEMO_BLOG_USERNAME, hasDemoContent: true }

describe('BlogPostPage', () => {
  it('muestra el post cuando el slug existe', async () => {
    expect((await mountPost(posts[0].slug, demoOwner)).text()).toContain(posts[0].title)
  })

  it('muestra el estado vacio cuando el slug no existe', async () => {
    expect((await mountPost('no-existe', demoOwner)).text()).toContain('No se encontró el artículo')
  })

  it('los posts de ejemplo no aparecen en el blog de otro usuario', async () => {
    const wrapper = await mountPost(posts[0].slug, { username: 'otra', hasDemoContent: false })

    expect(wrapper.text()).not.toContain(posts[0].title)
    expect(wrapper.text()).toContain('No se encontró el artículo')
  })
})
