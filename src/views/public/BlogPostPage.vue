<script setup lang="ts">
import { FileQuestion } from '@lucide/vue'
import { computed } from 'vue'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { posts } from '@/data/posts'

const props = defineProps<{ slug: string }>()

const post = computed(() => posts.find((p) => p.slug === props.slug))
</script>

<template>
  <article v-if="post" class="space-y-6">
    <RouterLink :to="{ name: 'public-writing' }" class="text-sm text-muted hover:text-accent-text">
      ← Volver a escritos
    </RouterLink>
    <div>
      <p class="text-xs text-muted">{{ post.date }}</p>
      <h1 class="mt-1 text-2xl font-semibold text-foreground">{{ post.title }}</h1>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <BaseBadge v-for="tag in post.tags" :key="tag" tone="ruby">{{ tag }}</BaseBadge>
      </div>
    </div>
    <div class="space-y-4 text-muted">
      <p v-for="(paragraph, index) in post.paragraphs" :key="index">{{ paragraph }}</p>
    </div>
  </article>

  <EmptyState
    v-else
    :icon="FileQuestion"
    title="No se encontró el artículo"
    description="Puede que se haya movido o todavía no exista."
  />
</template>
