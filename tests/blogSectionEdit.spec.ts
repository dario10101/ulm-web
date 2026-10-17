import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi } from './helpers/fetchMock'
import { ABOUT, BOOKS, HOME, item, lastBody, mountAdmin, settle } from './helpers/blogAdmin'

type Reply = { status: number; body?: unknown }

function api(extra: Record<string, Reply> = {}) {
  return mockApi({
    'GET /blog/sections': { status: 200, body: [HOME, ABOUT, BOOKS] },
    'GET /blog/sections/BOOKS/groups': {
      status: 200,
      body: [{ id: 'G1', label: 'Ficción', description: null, position: 0 }],
    },
    'GET /blog/sections/BOOKS/items': {
      status: 200,
      body: [item('A', { group_id: 'G1' }), item('B', { status: 'published' })],
    },
    ...extra,
  })
}

describe('/admin/blog/sections/:id (editor)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('una seccion inexistente lo dice', async () => {
    api()

    const { wrapper } = await mountAdmin('/admin/blog/sections/nada')

    expect(wrapper.text()).toContain("This section doesn't exist")
  })

  it('la cabecera manda solo lo que cambio y avisa al cambiar la URL', async () => {
    const fetch = api({
      'PATCH /blog/sections/home': { status: 200, body: { ...HOME, label: 'Inicio' } },
    })
    const { wrapper } = await mountAdmin('/admin/blog/sections/home')

    await wrapper.find('input[aria-label="Menu name"]').setValue('Inicio')
    await wrapper.find('input[aria-label="URL slug"]').setValue('otra')
    expect(wrapper.text()).toContain('Changing the URL breaks links')
    await wrapper.find('input[aria-label="URL slug"]').setValue('inicio')
    await wrapper.findAll('form')[0].trigger('submit')
    await settle()

    expect(lastBody(fetch, 'PATCH', '/blog/sections/home')).toEqual({ label: 'Inicio' })
  })

  it('el formulario de Inicio guarda el contenido limpio (URL vacia -> null)', async () => {
    const fetch = api({
      'PUT /blog/sections/home/content': { status: 200, body: HOME },
    })
    const { wrapper } = await mountAdmin('/admin/blog/sections/home')

    await wrapper.find('input[aria-label="Headline"]').setValue('Datos y código')
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Add highlight'))!
      .trigger('click')
    await wrapper.find('input[aria-label="Highlight title"]').setValue('ULM')
    await wrapper.find('input[aria-label="Highlight image URL"]').setValue('  ')
    await wrapper.findAll('form')[1].trigger('submit')
    await settle()

    expect(lastBody(fetch, 'PUT', '/blog/sections/home/content')).toEqual({
      headline: 'Datos y código',
      intro: '',
      highlights: [{ kind: 'project', title: 'ULM', description: '', image_url: null, url: null }],
      cta: null,
    })
  })

  it('muestra el error de validacion del backend', async () => {
    api({
      'PUT /blog/sections/about/content': {
        status: 422,
        body: { detail: 'photo_url: La URL debe empezar con https://' },
      },
    })
    const { wrapper } = await mountAdmin('/admin/blog/sections/about')

    await wrapper.find('input[aria-label="Photo URL"]').setValue('http://x.com/a.png')
    await wrapper.findAll('form')[1].trigger('submit')
    await settle()

    expect(wrapper.find('[role="alert"]').text()).toContain('photo_url')
  })

  it('la vista previa renderiza el markdown', async () => {
    api()
    const { wrapper } = await mountAdmin('/admin/blog/sections/about')

    await wrapper.find('textarea[aria-label="Bio"]').setValue('Hola **mundo**')
    await wrapper
      .findAll('button[role="tab"]')
      .find((b) => b.text() === 'Preview')!
      .trigger('click')

    expect(wrapper.find('[data-test="markdown-preview"] strong').text()).toBe('mundo')
  })

  it('salir con cambios sin guardar pide confirmacion', async () => {
    api()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { wrapper, router } = await mountAdmin('/admin/blog/sections/about')

    await wrapper.find('textarea[aria-label="Bio"]').setValue('Cambiado')
    await router.push('/admin/blog')

    expect(confirm).toHaveBeenCalled()
    expect(router.currentRoute.value.fullPath).toBe('/admin/blog/sections/about')
  })

  describe('coleccion', () => {
    it('lista los elementos con su estado y link de descarga', async () => {
      api()

      const { wrapper } = await mountAdmin('/admin/blog/sections/BOOKS')

      const rows = wrapper.findAll('[data-test="item-row"]')
      expect(rows.map((r) => r.text())).toEqual([
        expect.stringContaining('Draft'),
        expect.stringContaining('Published'),
      ])
      expect(rows[0].text()).toContain('Ficción')
      expect(rows[0].find('a[download]').attributes('href')).toBe(
        '/api/v1/blog/sections/BOOKS/items/A/download',
      )
      // Orden por fecha: sin flechas.
      expect(wrapper.find('button[aria-label="Move Item A up"]').exists()).toBe(false)
    })

    it('con orden manual aparecen las flechas y mandan el orden completo', async () => {
      const manual = { ...BOOKS, content: { ...BOOKS.content, sort: 'manual' } }
      const fetch = api({
        'GET /blog/sections': { status: 200, body: [manual] },
        'PUT /blog/sections/BOOKS/items/order': { status: 200, body: [item('B'), item('A')] },
      })
      const { wrapper } = await mountAdmin('/admin/blog/sections/BOOKS')

      await wrapper.find('button[aria-label="Move Item B up"]').trigger('click')
      await settle()

      expect(lastBody(fetch, 'PUT', '/blog/sections/BOOKS/items/order')).toEqual({
        ids: ['B', 'A'],
      })
    })

    it('publicar y mover de subseccion mandan el PATCH', async () => {
      const fetch = api({
        'PATCH /blog/sections/BOOKS/items/A': {
          status: 200,
          body: item('A', { status: 'published', group_id: 'G1' }),
        },
      })
      const { wrapper } = await mountAdmin('/admin/blog/sections/BOOKS')

      const row = wrapper.findAll('[data-test="item-row"]')[0]
      await row
        .findAll('button')
        .find((b) => b.text() === 'Publish')!
        .trigger('click')
      await settle()
      expect(lastBody(fetch, 'PATCH', '/blog/sections/BOOKS/items/A')).toEqual({
        status: 'published',
      })

      await row.find('select').setValue('')
      await settle()
      expect(lastBody(fetch, 'PATCH', '/blog/sections/BOOKS/items/A')).toEqual({
        group_id: null,
      })
    })

    it('subir un .md manda multipart; un slug repetido ofrece reemplazarlo', async () => {
      const replies: Reply[] = [
        { status: 409, body: { detail: "El slug 'dune' ya esta en uso" } },
        { status: 200, body: item('A', { title: 'Dune' }) },
      ]
      const fetch = api()
      const base = fetch.getMockImplementation()!
      const uploads: { url: string; body: unknown }[] = []
      fetch.mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === 'POST' && url.includes('/items')) {
          uploads.push({ url, body: init.body })
          const reply = replies.shift()!
          return Promise.resolve({
            ok: reply.status < 300,
            status: reply.status,
            json: () => Promise.resolve(reply.body),
          }) as never
        }
        return base(url, init)
      })
      const { wrapper } = await mountAdmin('/admin/blog/sections/BOOKS')

      const input = wrapper.find('input[data-test="file-input"]')
      const file = new File(['---\ntitle: Dune\n---\n'], 'dune.md', { type: 'text/markdown' })
      Object.defineProperty(input.element, 'files', { value: [file] })
      await input.trigger('change')
      await settle()

      expect(uploads[0].body).toBeInstanceOf(FormData)
      expect((uploads[0].body as FormData).get('file')).toBe(file)
      expect(wrapper.find('[data-test="upload-results"]').text()).toContain('ya esta en uso')

      await wrapper
        .findAll('button')
        .find((b) => b.text() === 'Replace it')!
        .trigger('click')
      await settle()

      expect(uploads[1].url).toContain('?replace=true')
      expect(wrapper.find('[data-test="upload-results"]').text()).toContain('Replaced "Dune"')
    })

    it('las plantillas no muestran subsecciones ni elementos', async () => {
      api()

      const { wrapper } = await mountAdmin('/admin/blog/sections/home')

      expect(wrapper.text()).not.toContain('Subsections')
      expect(wrapper.text()).not.toContain('Items (.md)')
    })
  })
})
