<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'

import type { BlogLink } from '@/types/blog'

// Links de una plantilla (Sobre mi, Perfil profesional). Externos siempre:
// pestaña nueva, sin acceso a esta ventana ni Referer.
defineProps<{ links: BlogLink[] }>()
</script>

<template>
  <div v-if="links.length">
    <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Enlaces</h2>
    <ul class="flex flex-wrap gap-3">
      <li v-for="link in links" :key="link.url">
        <a
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="inline-flex items-center gap-1.5 rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-accent-text/50"
        >
          {{ link.label }}
          <ExternalLink class="h-3.5 w-3.5 text-muted" />
        </a>
      </li>
    </ul>
  </div>
</template>
