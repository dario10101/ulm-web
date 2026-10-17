<script setup lang="ts">
import { computed } from 'vue'

import MarkdownContent from '@/components/blog/MarkdownContent.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import type { HomeContent, PublicSection } from '@/types/blog'

// Inicio: introduccion general del blog y lo que ofrece (proyectos, productos).
const props = defineProps<{ section: PublicSection }>()

const content = computed(() => props.section.content as unknown as HomeContent)

const kindLabels: Record<HomeContent['highlights'][number]['kind'], string> = {
  project: 'Proyecto',
  product: 'Producto',
  link: 'Enlace',
}
</script>

<template>
  <div class="space-y-12">
    <section>
      <p class="mb-3 text-sm font-medium text-ruby-text">{{ section.label }}</p>
      <h1
        v-if="content.headline"
        class="text-3xl font-semibold leading-tight text-foreground sm:text-4xl"
      >
        {{ content.headline }}
      </h1>
      <MarkdownContent
        v-if="content.intro"
        :source="content.intro"
        class="mt-4 max-w-2xl text-muted"
      />
      <a
        v-if="content.cta"
        :href="content.cta.url"
        target="_blank"
        rel="noopener noreferrer nofollow"
        class="mt-6 inline-flex rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta-hover"
      >
        {{ content.cta.label }}
      </a>
    </section>

    <section v-if="content.highlights.length">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Destacados</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <component
          :is="highlight.url ? 'a' : 'div'"
          v-for="highlight in content.highlights"
          :key="highlight.title"
          v-bind="
            highlight.url
              ? { href: highlight.url, target: '_blank', rel: 'noopener noreferrer nofollow' }
              : {}
          "
          class="overflow-hidden rounded-xl border border-subtle bg-surface"
          :class="{ 'transition-colors hover:border-accent-text/50': highlight.url }"
        >
          <img
            v-if="highlight.image_url"
            :src="highlight.image_url"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
            class="aspect-[2/1] w-full object-cover"
          />
          <div class="space-y-2 p-4">
            <BaseBadge tone="accent">{{ kindLabels[highlight.kind] }}</BaseBadge>
            <h3 class="font-medium text-foreground">{{ highlight.title }}</h3>
            <p v-if="highlight.description" class="text-sm text-muted">
              {{ highlight.description }}
            </p>
          </div>
        </component>
      </div>
    </section>
  </div>
</template>
