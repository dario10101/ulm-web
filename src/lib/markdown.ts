import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

/**
 * Markdown del blog -> HTML seguro (PLAN-BLOG.md, 9.1).
 *
 * El contenido lo escribe cualquier usuario y lo lee cualquiera, en el mismo
 * origen que la app privada: un `<script>` que pasara se ejecutaria con la
 * sesion de quien lo abre (XSS almacenado). Por eso dos capas:
 *
 * 1. markdown-it con `html: false`: el HTML crudo del .md se escapa como
 *    texto, no se interpreta. Links solo http(s), mailto, anclas y rutas
 *    propias; imagenes solo https (una http se muestra como su texto
 *    alternativo).
 * 2. DOMPurify sobre el HTML final: aunque markdown-it tuviera un bug, lo
 *    que llega al DOM no puede llevar scripts ni atributos `on*`.
 *
 * El resultado solo se pinta con `MarkdownContent.vue`, el unico `v-html`
 * del sitio publico.
 */

// http(s), mailto, anclas (#) y rutas del sitio (/blog/...), pero no
// "//otro-sitio" (relativa al protocolo, sale del sitio sin decir a donde).
const SAFE_URL = /^(?:https?:|mailto:|#|\/(?!\/))/i

const md = new MarkdownIt({ html: false, linkify: true })

md.validateLink = (url) => SAFE_URL.test(url.trim())

const renderImage = md.renderer.rules.image!
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (!(token.attrGet('src') ?? '').startsWith('https://')) {
    // Imagenes solo por https (B14): una http no carga en una pagina https.
    return md.utils.escapeHtml(token.content)
  }
  // Diferida, y sin decirle al otro sitio desde que pagina se la pide.
  token.attrSet('loading', 'lazy')
  token.attrSet('referrerpolicy', 'no-referrer')
  return renderImage(tokens, idx, options, env, self)
}

const renderLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (/^https?:/i.test(token.attrGet('href') ?? '')) {
    // Externo: pestaña nueva, sin acceso a esta ventana (noopener) ni
    // Referer, y sin transferir reputacion a sitios que nadie reviso.
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer nofollow')
  }
  return renderLinkOpen(tokens, idx, options, env, self)
}

// DOMPurify aplica ALLOWED_URI_REGEXP a todo atributo que no tenga por
// seguro, no solo a href/src: sin la segunda alternativa descartaria
// target="_blank" o loading="lazy". Un valor sin ":" ni "/" no es una URL
// que saque del sitio.
const PURIFY_ALLOWED = new RegExp(`${SAFE_URL.source}|^[^:/]*$`, 'i')

export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(md.render(source), {
    ADD_ATTR: ['target', 'loading', 'referrerpolicy'],
    ALLOWED_URI_REGEXP: PURIFY_ALLOWED,
  })
}
