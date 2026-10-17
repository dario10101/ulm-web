<script setup lang="ts">
import BaseBadge from '@/components/ui/BaseBadge.vue'
import type { PublicItemSummary } from '@/types/blog'

// Un elemento en el listado de una coleccion: fila (layout "list") o tarjeta
// con portada (layout "cards"). Lleva al .md renderizado.
defineProps<{
  item: PublicItemSummary
  username: string
  section: string
  layout: 'list' | 'cards'
}>()
</script>

<template>
  <RouterLink
    :to="{ name: 'blog-item', params: { username, section, item: item.slug } }"
    :class="
      layout === 'cards'
        ? 'block overflow-hidden rounded-xl border border-subtle bg-surface transition-colors hover:border-accent-text/50'
        : 'block border-b border-subtle pb-6 last:border-0'
    "
  >
    <img
      v-if="layout === 'cards' && item.cover_url"
      :src="item.cover_url"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
      class="aspect-[2/1] w-full object-cover"
    />
    <div :class="{ 'p-4': layout === 'cards' }">
      <p v-if="item.date" class="text-xs text-muted">{{ item.date }}</p>
      <h3 class="mt-1 font-medium text-foreground hover:text-accent-text">{{ item.title }}</h3>
      <p v-if="item.excerpt" class="mt-1 text-sm text-muted">{{ item.excerpt }}</p>
      <div v-if="item.tags.length" class="mt-2 flex flex-wrap gap-1.5">
        <BaseBadge v-for="tag in item.tags" :key="tag" tone="ruby">{{ tag }}</BaseBadge>
      </div>
    </div>
  </RouterLink>
</template>
