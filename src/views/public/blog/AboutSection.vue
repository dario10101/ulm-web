<script setup lang="ts">
import { computed } from 'vue'

import BlogLinks from '@/components/blog/BlogLinks.vue'
import MarkdownContent from '@/components/blog/MarkdownContent.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import type { AboutContent, PublicSection } from '@/types/blog'

// Sobre mi: introduccion personal.
const props = defineProps<{ section: PublicSection }>()

const content = computed(() => props.section.content as unknown as AboutContent)
</script>

<template>
  <div class="space-y-10">
    <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
      <img
        v-if="content.photo_url"
        :src="content.photo_url"
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
        class="h-28 w-28 shrink-0 rounded-full object-cover"
      />
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold text-foreground">{{ section.label }}</h1>
        <MarkdownContent v-if="content.bio" :source="content.bio" class="mt-4 text-muted" />
      </div>
    </div>

    <div v-if="content.interests.length">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Intereses</h2>
      <div class="flex flex-wrap gap-2">
        <BaseBadge v-for="interest in content.interests" :key="interest">{{ interest }}</BaseBadge>
      </div>
    </div>

    <BlogLinks :links="content.links" />
  </div>
</template>
