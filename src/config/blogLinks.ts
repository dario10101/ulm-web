import { Briefcase, Globe, Link, Mail, ShoppingBag, ShoppingCart } from '@lucide/vue'
import {
  siBuymeacoffee,
  siEtsy,
  siFacebook,
  siGithub,
  siGitlab,
  siInstagram,
  siKaggle,
  siPatreon,
  siTiktok,
  siUdemy,
  siWhatsapp,
  siX,
  siYoutube,
  type SimpleIcon,
} from 'simple-icons'
import type { Component } from 'vue'

/**
 * Presentacion de los links del blog (ulm-core app/services/blog_links.py,
 * PLAN-BLOG-LINKS.md). Las reglas (dominios, topes) vienen del backend en
 * GET /blog/settings; aca solo lo visual: icono por tipo y nombre de cada
 * categoria.
 *
 * Iconos de marca: simple-icons (CC0, se importa solo lo usado). LinkedIn,
 * Mercado Libre y Amazon no estan en el paquete (retirados a pedido de cada
 * marca): usan un icono generico de lucide.
 */
export type LinkIcon = { kind: 'brand'; icon: SimpleIcon } | { kind: 'lucide'; icon: Component }

const brand = (icon: SimpleIcon): LinkIcon => ({ kind: 'brand', icon })
const generic = (icon: Component): LinkIcon => ({ kind: 'lucide', icon })

const LINK_ICONS: Record<string, LinkIcon> = {
  email: generic(Mail),
  whatsapp: brand(siWhatsapp),
  linkedin: generic(Briefcase),
  github: brand(siGithub),
  gitlab: brand(siGitlab),
  kaggle: brand(siKaggle),
  x: brand(siX),
  instagram: brand(siInstagram),
  facebook: brand(siFacebook),
  tiktok: brand(siTiktok),
  youtube: brand(siYoutube),
  mercadolibre: generic(ShoppingBag),
  amazon: generic(ShoppingCart),
  etsy: brand(siEtsy),
  udemy: brand(siUdemy),
  buymeacoffee: brand(siBuymeacoffee),
  patreon: brand(siPatreon),
  website: generic(Globe),
}

export function linkIcon(type: string): LinkIcon {
  return LINK_ICONS[type] ?? generic(Link)
}

// Color de los que no traen el de su marca (iconos genericos) o cuyo color
// no se ve bien: el amarillo de Buy Me a Coffee y Mercado Libre casi
// desaparece sobre fondo claro.
const COLOR_OVERRIDES: Record<string, string> = {
  email: 'EA4335',
  linkedin: '0A66C2',
  mercadolibre: '3483FA',
  amazon: 'FF9900',
  buymeacoffee: 'E8A317',
}

/**
 * Color de marca del icono (#rrggbb), o null para usar el del texto. Las
 * marcas negras (GitHub, X, TikTok, Patreon) van con el color del texto: en
 * tema oscuro serian invisibles.
 */
export function linkIconColor(type: string): string | null {
  const icon = LINK_ICONS[type]
  const hex = COLOR_OVERRIDES[type] ?? (icon?.kind === 'brand' ? icon.icon.hex : null)
  if (!hex) return null
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40 ? null : `#${hex}`
}

// Sitio publico en espanol; admin en ingles.
export const LINK_CATEGORY_LABELS_ES: Record<string, string> = {
  contact: 'Contacto',
  professional: 'Profesional',
  social: 'Redes sociales',
  shop: 'Tienda',
  support: 'Apoya mi trabajo',
  web: 'Web',
}

export const LINK_CATEGORY_LABELS_EN: Record<string, string> = {
  contact: 'Contact',
  professional: 'Professional',
  social: 'Social media',
  shop: 'Shop',
  support: 'Support my work',
  web: 'Web',
}

/** Agrupa en el orden de `categories`, conservando el orden dentro de cada
 * una. Las categorias sin elementos no salen. */
export function groupByCategory<T>(
  items: T[],
  categoryOf: (item: T) => string,
  categories: readonly string[],
): { category: string; items: T[] }[] {
  const groups = categories.map((category) => ({
    category,
    items: items.filter((item) => categoryOf(item) === category),
  }))
  const unknown = items.filter((item) => !categories.includes(categoryOf(item)))
  if (unknown.length) groups.push({ category: 'other', items: unknown })
  return groups.filter((group) => group.items.length)
}

/**
 * Deshace la ofuscacion de correo y telefono (base64 del link invertido, ver
 * obfuscate en ulm-core). Solo se acepta lo que el backend puede producir:
 * mailto: o https://; cualquier otra cosa se descarta.
 */
export function decodeLink(encoded: string): string | null {
  try {
    const url = atob(encoded).split('').reverse().join('')
    return /^(mailto:|https:\/\/)/i.test(url) ? url : null
  } catch {
    return null
  }
}

/** Lo que el admin necesita del catalogo para validar (BlogLinkType). */
export interface LinkRules {
  label: string
  kind: 'url' | 'email' | 'phone'
  domains: string[]
}

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/
const PHONE_DIGITS = /^[1-9]\d{7,14}$/

/**
 * Validacion inmediata en el formulario, con las mismas reglas que el backend
 * (que es la autoridad: si algo se escapa aca, responde 422 con el motivo).
 * Devuelve el mensaje de error o null.
 */
export function validateLinkInput(rules: LinkRules, raw: string): string | null {
  const value = raw.trim()
  if (!value) return 'Required.'
  if (rules.kind === 'email') {
    return EMAIL.test(value.replace(/^mailto:/i, '')) ? null : 'Enter a valid email address.'
  }
  if (rules.kind === 'phone') {
    if (/^(https?:\/\/)?wa\.me\//i.test(value)) return null
    const digits = value.replace(/[\s\-().]/g, '').replace(/^\+/, '')
    return PHONE_DIGITS.test(digits) ? null : 'Use the country code and digits only.'
  }
  let url: URL
  try {
    url = new URL(value.includes('://') ? value : `https://${value}`)
  } catch {
    return 'Not a valid URL.'
  }
  if (url.protocol !== 'https:') return 'The link must start with https://'
  if (url.username || url.password || url.port) {
    return "The link can't include a user, password or port."
  }
  const host = url.hostname.toLowerCase()
  if (!host.includes('.')) return 'Not a valid URL.'
  if (rules.domains.length && !rules.domains.some((d) => host === d || host.endsWith(`.${d}`))) {
    return `A ${rules.label} link must be on ${rules.domains.slice(0, 3).join(', ')}${
      rules.domains.length > 3 ? '...' : ''
    }`
  }
  return null
}
