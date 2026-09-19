<script setup lang="ts">
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { posts } from '@/data/posts'
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold text-foreground">Escritos</h1>
      <p class="mt-2 text-muted">Notas sobre datos, código, y lo que vaya surgiendo.</p>
    </div>

    <div class="space-y-6">
      <RouterLink
        v-for="post in posts"
        :key="post.slug"
        :to="{ name: 'public-writing-post', params: { slug: post.slug } }"
        class="block border-b border-subtle pb-6 last:border-0"
      >
        <p class="text-xs text-muted">{{ post.date }}</p>
        <h2 class="mt-1 font-medium text-foreground hover:text-accent-text">{{ post.title }}</h2>
        <p class="mt-1 text-sm text-muted">{{ post.excerpt }}</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <BaseBadge v-for="tag in post.tags" :key="tag" tone="ruby">{{ tag }}</BaseBadge>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
