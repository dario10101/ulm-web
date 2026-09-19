import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import BlogPostPage from '../src/views/public/BlogPostPage.vue'
import { posts } from '../src/data/posts'

// RouterLink se usa dentro del componente (breadcrumb "Back to writing"),
// asi que montamos con un router real minimo en vez de mockear todo.
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/blog/writing', name: 'public-writing', component: { template: '<div />' } }],
})

describe('BlogPostPage', () => {
  it('muestra el post cuando el slug existe', async () => {
    const wrapper = mount(BlogPostPage, {
      props: { slug: posts[0].slug },
      global: { plugins: [router] },
    })

    expect(wrapper.text()).toContain(posts[0].title)
  })

  it('muestra el estado vacio cuando el slug no existe', async () => {
    const wrapper = mount(BlogPostPage, {
      props: { slug: 'no-existe' },
      global: { plugins: [router] },
    })

    expect(wrapper.text()).toContain('No se encontró el artículo')
  })
})
