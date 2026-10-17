<script setup lang="ts">
import { FileQuestion } from '@lucide/vue'
import { ref, shallowRef, watch } from 'vue'

import MarkdownContent from '@/components/blog/MarkdownContent.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useBlogOwner } from '@/composables/useBlogOwner'
import { ApiError } from '@/lib/http'
import { getPublicItem } from '@/services/publicBlogApi'
import type { PublicItem } from '@/types/blog'

// Un elemento (.md) de una coleccion, renderizado de forma segura.
const props = defineProps<{ section: string; item: string }>()

const owner = useBlogOwner()
const entry = shallowRef<PublicItem | null>(null)
const state = ref<'loading' | 'ready' | 'not-found' | 'error'>('loading')

watch(
  () => [owner.value?.username, props.section, props.item] as const,
  async ([username, section, item]) => {
    if (!username) return
    state.value = 'loading'
    try {
      entry.value = await getPublicItem(username, section, item)
      state.value = 'ready'
    } catch (err) {
      state.value = err instanceof ApiError && err.status === 404 ? 'not-found' : 'error'
    }
  },
  { immediate: true },
)
</script>

<template>
  <article v-if="state === 'ready' && entry && owner" class="mx-auto max-w-3xl space-y-6">
    <RouterLink
      :to="{
        name: 'blog-section',
        params: { username: owner.username, section: entry.section.slug },
      }"
      class="text-sm text-muted hover:text-accent-text"
    >
      ← Volver a {{ entry.section.label }}
    </RouterLink>
    <header>
      <p v-if="entry.date" class="text-xs text-muted">{{ entry.date }}</p>
      <h1 class="mt-1 text-2xl font-semibold text-foreground">{{ entry.title }}</h1>
      <div v-if="entry.tags.length" class="mt-2 flex flex-wrap gap-1.5">
        <BaseBadge v-for="tag in entry.tags" :key="tag" tone="ruby">{{ tag }}</BaseBadge>
      </div>
    </header>
    <img
      v-if="entry.cover_url"
      :src="entry.cover_url"
      alt=""
      referrerpolicy="no-referrer"
      class="aspect-[2/1] w-full rounded-xl object-cover"
    />
    <MarkdownContent :source="entry.body_md" class="text-muted" />
  </article>

  <EmptyState
    v-else-if="state === 'not-found'"
    :icon="FileQuestion"
    title="No se encontró el artículo"
    description="Puede que se haya movido o todavía no exista."
  />
  <p v-else-if="state === 'error'" class="text-center text-sm text-ruby-text">
    No se pudo cargar el artículo. Intenta de nuevo en un momento.
  </p>
</template>
