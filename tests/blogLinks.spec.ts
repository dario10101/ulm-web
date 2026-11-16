import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import BlogLinkList from '../src/components/blog/BlogLinkList.vue'
import CollapsibleCard from '../src/components/ui/CollapsibleCard.vue'
import { decodeLink, validateLinkInput } from '../src/config/blogLinks'
import type { PublicLink } from '../src/types/blog'
import type { AdminLink } from '../src/types/blogAdmin'
import { mockApi } from './helpers/fetchMock'
import { ABOUT, BOOKS, HOME, lastBody, mountAdmin, settle, SETTINGS } from './helpers/blogAdmin'

// Igual que obfuscate() de ulm-core: base64 del link invertido.
const encode = (url: string) => btoa(url.split('').reverse().join(''))

const GITHUB: AdminLink = {
  id: 'L1',
  type: 'github',
  url: 'https://github.com/ruben',
  label: null,
  used_in: 1,
}
const EMAIL: AdminLink = {
  id: 'L2',
  type: 'email',
  url: 'mailto:yo@x.co',
  label: 'Escríbeme',
  used_in: 0,
}

describe('validacion de links en el formulario', () => {
  const github = { label: 'GitHub', kind: 'url' as const, domains: ['github.com'] }

  it('acepta el dominio y sus subdominios, sin https explicito', () => {
    expect(validateLinkInput(github, 'github.com/ruben')).toBeNull()
    expect(validateLinkInput(github, 'https://gist.github.com/ruben')).toBeNull()
  })

  it.each([
    'https://gitlab.com/ruben',
    'https://github.com.evil.io/x',
    'http://github.com/ruben',
    'https://github.com@evil.io/x',
  ])('rechaza %s', (raw) => {
    expect(validateLinkInput(github, raw)).not.toBeNull()
  })

  it('correo y telefono', () => {
    const email = { label: 'Email', kind: 'email' as const, domains: [] }
    const phone = { label: 'WhatsApp', kind: 'phone' as const, domains: ['wa.me'] }
    expect(validateLinkInput(email, 'yo@x.co')).toBeNull()
    expect(validateLinkInput(email, 'yo@')).not.toBeNull()
    expect(validateLinkInput(phone, '+57 300 123 4567')).toBeNull()
    expect(validateLinkInput(phone, '300')).not.toBeNull()
  })

  it('decodeLink solo devuelve mailto: o https://', () => {
    expect(decodeLink(encode('mailto:yo@x.co'))).toBe('mailto:yo@x.co')
    expect(decodeLink(encode('javascript:alert(1)'))).toBeNull()
    expect(decodeLink('%%%')).toBeNull()
  })
})

describe('BlogLinkList (sitio publico)', () => {
  const links: PublicLink[] = [
    {
      type: 'email',
      category: 'contact',
      label: 'Escríbeme',
      url: null,
      encoded: encode('mailto:yo@x.co'),
    },
    {
      type: 'github',
      category: 'professional',
      label: 'GitHub',
      url: 'https://github.com/r',
      encoded: null,
    },
    { type: 'x', category: 'social', label: 'X', url: 'https://x.com/r', encoded: null },
  ]

  it('en medio: agrupa por categoria con icono y nombre; el correo no esta en la pagina', () => {
    const wrapper = mount(BlogLinkList, { props: { links, variant: 'inline' } })

    expect(wrapper.text()).toContain('Contacto')
    expect(wrapper.text()).toContain('Profesional')
    expect(wrapper.text()).toContain('Redes sociales')
    expect(wrapper.text()).not.toContain('Tienda') // categoria sin links
    expect(wrapper.find('a[href="https://github.com/r"]').text()).toBe('GitHub')
    expect(wrapper.html()).not.toContain('yo@x.co')
    expect(wrapper.html()).not.toContain('mailto')
  })

  it('al hacer clic arma el link ofuscado', async () => {
    const wrapper = mount(BlogLinkList, { props: { links, variant: 'inline' } })
    const location = { href: '' }
    vi.stubGlobal('location', location)

    await wrapper.find('button').trigger('click')

    expect(location.href).toBe('mailto:yo@x.co')
    vi.unstubAllGlobals()
  })

  it('al final: solo iconos, con el nombre accesible', () => {
    const wrapper = mount(BlogLinkList, { props: { links, variant: 'end' } })

    const github = wrapper.find('a[href="https://github.com/r"]')
    expect(github.text()).toBe('')
    expect(github.attributes('aria-label')).toBe('GitHub')
    expect(wrapper.find('button').attributes('aria-label')).toBe('Escríbeme')
  })

  it('sin links no pinta nada', () => {
    const wrapper = mount(BlogLinkList, { props: { links: [], variant: 'end' } })
    expect(wrapper.find('nav').exists()).toBe(false)
  })
})

describe('CollapsibleCard', () => {
  beforeEach(() => localStorage.clear())

  it('arranca contraido y recuerda el estado por navegador', async () => {
    const make = () =>
      mount(CollapsibleCard, {
        props: { title: 'Links', storageKey: 'test.card' },
        slots: { default: '<p class="body">Contenido</p>' },
        attachTo: document.body,
      })
    const first = make()
    expect(first.find('.body').isVisible()).toBe(false)
    expect(first.find('button').attributes('aria-expanded')).toBe('false')

    await first.find('button').trigger('click')
    expect(first.find('.body').isVisible()).toBe(true)

    const again = make()
    expect(again.find('button').attributes('aria-expanded')).toBe('true')
  })
})

describe('links en el admin', () => {
  function api(extra: Record<string, { status: number; body?: unknown }> = {}) {
    return mockApi({
      'GET /me': { status: 200, body: {} },
      'GET /blog/settings': { status: 200, body: SETTINGS },
      'GET /blog/sections': { status: 200, body: [HOME, ABOUT, BOOKS] },
      'GET /blog/links': { status: 200, body: [GITHUB, EMAIL] },
      ...extra,
    })
  }

  it('/admin/blog lista los links por categoria y crea uno nuevo', async () => {
    const created: AdminLink = {
      id: 'L3',
      type: 'website',
      url: 'https://a.dev',
      label: 'Portafolio',
      used_in: 0,
    }
    const fetch = api({ 'POST /blog/links': { status: 201, body: created } })
    const { wrapper } = await mountAdmin('/admin/blog')

    expect(wrapper.findAll('[data-test="link-row"]').map((row) => row.text())).toEqual([
      expect.stringContaining('Escríbeme'),
      expect.stringContaining('GitHub'),
    ])

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('New link'))!
      .trigger('click')
    await wrapper.find('select[aria-label="Link type"]').setValue('website')
    await wrapper.find('input[aria-label="Link (https)"]').setValue('https://a.dev')
    // Sitio web exige nombre: no se envia sin el.
    await wrapper.find('form[role="dialog"]').trigger('submit')
    expect(wrapper.text()).toContain('Give it a name')
    expect(lastBody(fetch, 'POST', '/blog/links')).toBeUndefined()

    await wrapper.find('input[aria-label="Name to show"]').setValue('Portafolio')
    await wrapper.find('form[role="dialog"]').trigger('submit')
    await settle()

    expect(lastBody(fetch, 'POST', '/blog/links')).toEqual({
      type: 'website',
      url: 'https://a.dev',
      label: 'Portafolio',
    })
    expect(wrapper.findAll('[data-test="link-row"]')).toHaveLength(3)
  })

  it('avisa la exposicion al elegir Email', async () => {
    api()
    const { wrapper } = await mountAdmin('/admin/blog')

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('New link'))!
      .trigger('click')
    await wrapper.find('select[aria-label="Link type"]').setValue('email')

    expect(wrapper.find('[role="note"]').text()).toContain('Anyone who visits your blog')
  })

  it('el editor de seccion habilita un link y lo guarda al momento', async () => {
    const home = {
      ...HOME,
      links: {
        inline: [
          { id: 'L1', enabled: false },
          { id: 'L2', enabled: false },
        ],
        end: [
          { id: 'L1', enabled: false },
          { id: 'L2', enabled: false },
        ],
      },
    }
    const fetch = api({
      'GET /blog/sections': { status: 200, body: [home] },
      'PUT /blog/sections/home/links': {
        status: 200,
        body: {
          ...home,
          links: { ...home.links, end: [{ id: 'L1', enabled: true }, home.links.end[1]] },
        },
      },
    })
    const { wrapper } = await mountAdmin('/admin/blog/sections/home')

    const end = wrapper.find('[data-test="links-end"]')
    await end.find('input[aria-label="Show GitHub at the end"]').trigger('change')
    await settle()

    expect(lastBody(fetch, 'PUT', '/blog/sections/home/links')).toEqual({
      inline: home.links.inline,
      end: [
        { id: 'L1', enabled: true },
        { id: 'L2', enabled: false },
      ],
    })
    expect(wrapper.find('[data-test="links-end"]').text()).toContain('1 shown')
  })
})
