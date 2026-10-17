import { describe, expect, it } from 'vitest'

import { renderMarkdown } from '../src/lib/markdown'

// El .md lo escribe cualquier usuario y se pinta con v-html en el mismo origen
// que la app privada: nada de lo de abajo puede llegar al DOM como codigo.
function render(md: string): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = renderMarkdown(md)
  return container
}

describe('renderMarkdown', () => {
  it('pinta el markdown normal', () => {
    const html = render('# Titulo\n\nTexto **fuerte** y `codigo`.\n\n- uno\n- dos')

    expect(html.querySelector('h1')?.textContent).toBe('Titulo')
    expect(html.querySelector('strong')?.textContent).toBe('fuerte')
    expect(html.querySelectorAll('li')).toHaveLength(2)
  })

  it.each([
    '<script>alert(1)</script>',
    '<img src="https://x.com/a.png" onerror="alert(1)">',
    '<iframe src="https://evil.com"></iframe>',
    '<a href="https://x.com" onclick="alert(1)">x</a>',
  ])('el HTML crudo se muestra como texto, no se interpreta: %s', (payload) => {
    const html = render(payload)

    expect(html.querySelector('script, iframe, img')).toBeNull()
    // Ningun manejador de eventos. (linkify si convierte en link la URL que
    // queda en el texto escapado: es inofensivo.)
    const handlers = [...html.querySelectorAll('*')].flatMap((el) =>
      el.getAttributeNames().filter((name) => name.startsWith('on')),
    )
    expect(handlers).toEqual([])
    expect(html.textContent).toContain(payload)
  })

  it.each([
    '[click](javascript:alert(1))',
    '[click](JaVaScRiPt:alert(1))',
    '[click](data:text/html;base64,PHNjcmlwdD4=)',
    '[click](vbscript:msgbox(1))',
    '[click](//evil.com/phish)',
  ])('un link peligroso no se convierte en link: %s', (md) => {
    const html = render(md)

    expect(html.querySelector('a')).toBeNull()
  })

  it('un link externo abre en otra pestaña sin acceso a esta ventana', () => {
    const link = render('[docs](https://example.com/docs)').querySelector('a')!

    expect(link.getAttribute('href')).toBe('https://example.com/docs')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow')
  })

  it('los links propios y mailto se mantienen, sin pestaña nueva', () => {
    const html = render('[otro post](/blog/ruben/escritos/x) [mail](mailto:yo@example.com)')
    const [own, mail] = html.querySelectorAll('a')

    expect(own.getAttribute('href')).toBe('/blog/ruben/escritos/x')
    expect(own.getAttribute('target')).toBeNull()
    expect(mail.getAttribute('href')).toBe('mailto:yo@example.com')
  })

  it('las imagenes https se cargan diferidas y sin Referer', () => {
    const img = render('![grafico](https://example.com/g.png)').querySelector('img')!

    expect(img.getAttribute('src')).toBe('https://example.com/g.png')
    expect(img.getAttribute('alt')).toBe('grafico')
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
  })

  it('una imagen que no es https se muestra como su texto alternativo', () => {
    const html = render('![grafico](http://example.com/g.png)')

    expect(html.querySelector('img')).toBeNull()
    expect(html.textContent).toContain('grafico')
  })

  it('una URL suelta se convierte en link (linkify)', () => {
    const link = render('Mira https://example.com').querySelector('a')!

    expect(link.getAttribute('href')).toBe('https://example.com')
  })
})
