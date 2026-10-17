import { afterEach, describe, expect, it } from 'vitest'

import { ME_ALL, mockApi } from './helpers/fetchMock'
import { ABOUT, BOOKS, HOME, lastBody, mountAdmin, SETTINGS, settle } from './helpers/blogAdmin'

function api(extra: Record<string, { status: number; body?: unknown }> = {}) {
  return mockApi({
    'GET /blog/settings': { status: 200, body: SETTINGS },
    'GET /blog/sections': { status: 200, body: [HOME, ABOUT, BOOKS] },
    ...extra,
  })
}

describe('/admin/blog (resumen)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('sin username pide crearlo primero y no consulta el blog', async () => {
    const fetch = mockApi({})

    const { wrapper } = await mountAdmin('/admin/blog', ME_ALL)

    expect(wrapper.text()).toContain('Create your username first')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('lista las secciones en orden con el contador de habilitadas', async () => {
    api()

    const { wrapper } = await mountAdmin('/admin/blog')

    const rows = wrapper.findAll('[data-test="section-row"]')
    expect(rows.map((r) => r.find('p').text())).toEqual(['Bienvenida', 'Sobre mí', 'Libros'])
    expect(rows[0].text()).toContain('/inicio')
    expect(wrapper.text()).toContain('2/2 enabled')
    expect(wrapper.find('a[href="/blog/ruben"]').exists()).toBe(true)
  })

  it('en el tope no deja habilitar otra seccion', async () => {
    api()

    const { wrapper } = await mountAdmin('/admin/blog')

    const books = wrapper.find('input[aria-label="Libros enabled"]')
    expect(books.attributes('disabled')).toBeDefined()
    expect(wrapper.find('input[aria-label="Bienvenida enabled"]').attributes('disabled')).toBe(
      undefined,
    )
  })

  it('deshabilitar una seccion manda el PATCH', async () => {
    const fetch = api({
      'PATCH /blog/sections/home': { status: 200, body: { ...HOME, enabled: false } },
    })
    const { wrapper } = await mountAdmin('/admin/blog')

    await wrapper.find('input[aria-label="Bienvenida enabled"]').trigger('change')
    await settle()

    expect(lastBody(fetch, 'PATCH', '/blog/sections/home')).toEqual({ enabled: false })
    expect(wrapper.text()).toContain('1/2 enabled')
  })

  it('subir una seccion manda el orden completo', async () => {
    const fetch = api({
      'PUT /blog/sections/order': { status: 200, body: [ABOUT, HOME, BOOKS] },
    })
    const { wrapper } = await mountAdmin('/admin/blog')

    await wrapper.find('button[aria-label="Move Sobre mí up"]').trigger('click')
    await settle()

    expect(lastBody(fetch, 'PUT', '/blog/sections/order')).toEqual({
      ids: ['about', 'home', 'BOOKS'],
    })
    expect(wrapper.findAll('[data-test="section-row"]')[0].text()).toContain('Sobre mí')
  })

  it('crear una seccion solo ofrece los tipos disponibles y abre su editor', async () => {
    const created = { ...BOOKS, id: 'NEW', label: 'Viajes', slug: 'viajes' }
    const fetch = api({ 'POST /blog/sections': { status: 201, body: created } })
    const { wrapper, router } = await mountAdmin('/admin/blog')

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('New section'))!
      .trigger('click')
    const options = wrapper.findAll('select[aria-label="Section type"] option')
    // Inicio y Sobre mi ya existen: solo queda Coleccion.
    expect(options.map((o) => o.text())).toEqual(['Collection'])

    await wrapper.find('input[aria-label="Menu name"]').setValue('Viajes')
    await wrapper.find('form[aria-label="New section"]').trigger('submit')
    await settle()

    expect(lastBody(fetch, 'POST', '/blog/sections')).toEqual({
      type: 'collection',
      label: 'Viajes',
      slug: null,
    })
    expect(router.currentRoute.value.fullPath).toBe('/admin/blog/sections/NEW')
  })

  it('borrar pide confirmacion y quita la fila', async () => {
    const fetch = api({ 'DELETE /blog/sections/BOOKS': { status: 204 } })
    const { wrapper } = await mountAdmin('/admin/blog')

    await wrapper.find('button[aria-label="Delete Libros"]').trigger('click')
    expect(wrapper.text()).toContain('Delete "Libros"?')
    await wrapper.find('[data-test="confirm"]').trigger('click')
    await settle()

    expect(fetch.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true)
    expect(wrapper.findAll('[data-test="section-row"]')).toHaveLength(2)
  })

  it('guarda los ajustes del blog', async () => {
    const fetch = api({
      'PUT /blog/settings': { status: 200, body: { ...SETTINGS, display_name: 'Rubén' } },
    })
    const { wrapper } = await mountAdmin('/admin/blog')

    await wrapper.find('input[aria-label="Display name"]').setValue('Rubén')
    await wrapper.findAll('form')[0].trigger('submit')
    await settle()

    expect(lastBody(fetch, 'PUT', '/blog/settings')).toEqual({
      enabled: true,
      display_name: 'Rubén',
    })
  })
})
