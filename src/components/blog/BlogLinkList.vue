<script setup lang="ts">
import { computed } from 'vue'

import LinkTypeIcon from '@/components/blog/LinkTypeIcon.vue'
import { decodeLink, groupByCategory, LINK_CATEGORY_LABELS_ES } from '@/config/blogLinks'
import type { PublicLink } from '@/types/blog'

/**
 * Links de una seccion, agrupados por categoria (PLAN-BLOG-LINKS.md, L3).
 * - `inline` (en medio de la pagina): botones con icono y nombre.
 * - `end` (al final de la plantilla): solo iconos, con el nombre en
 *   aria-label y title.
 * Ya vienen ordenados por categoria y solo los habilitados; una categoria sin
 * links no aparece.
 *
 * Correo y telefono llegan ofuscados (`encoded`): son un <button> que arma el
 * link recien al hacer clic, asi no hay un mailto: en la pagina para los bots
 * simples. No frena a uno que ejecute JavaScript.
 */
const props = defineProps<{ links: PublicLink[]; variant: 'inline' | 'end' }>()

const groups = computed(() => {
  const order = [...new Set(props.links.map((link) => link.category))]
  return groupByCategory(props.links, (link) => link.category, order)
})

function open(link: PublicLink) {
  const url = link.encoded ? decodeLink(link.encoded) : null
  if (!url) return
  if (url.startsWith('mailto:')) {
    window.location.href = url
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

const isInline = computed(() => props.variant === 'inline')
const linkClass = computed(() =>
  isInline.value
    ? 'inline-flex items-center gap-2 rounded-lg border border-subtle bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-accent-text/50 hover:text-accent-text'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground',
)
const iconClass = computed(() => (isInline.value ? 'h-4 w-4 shrink-0' : 'h-5 w-5'))
</script>

<template>
  <nav
    v-if="groups.length"
    :aria-label="isInline ? 'Enlaces' : 'Contacto y redes'"
    :class="
      isInline
        ? 'flex flex-wrap gap-x-10 gap-y-5'
        : 'flex flex-wrap justify-center gap-x-8 gap-y-4 border-t border-subtle pt-8'
    "
  >
    <div v-for="group in groups" :key="group.category" :class="{ 'text-center': !isInline }">
      <p
        class="mb-2 font-semibold uppercase tracking-wide text-muted"
        :class="isInline ? 'text-xs' : 'text-[0.65rem]'"
      >
        {{ LINK_CATEGORY_LABELS_ES[group.category] ?? 'Enlaces' }}
      </p>
      <ul class="flex flex-wrap" :class="isInline ? 'gap-2' : 'justify-center gap-1'">
        <li v-for="(link, index) in group.items" :key="`${link.type}-${index}`">
          <a
            v-if="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer nofollow"
            :class="linkClass"
            :aria-label="isInline ? undefined : link.label"
            :title="isInline ? undefined : link.label"
          >
            <LinkTypeIcon :type="link.type" :class="iconClass" />
            <span v-if="isInline">{{ link.label }}</span>
          </a>
          <button
            v-else-if="link.encoded"
            type="button"
            :class="linkClass"
            :aria-label="isInline ? undefined : link.label"
            :title="isInline ? undefined : link.label"
            @click="open(link)"
          >
            <LinkTypeIcon :type="link.type" :class="iconClass" />
            <span v-if="isInline">{{ link.label }}</span>
          </button>
        </li>
      </ul>
    </div>
  </nav>
</template>
