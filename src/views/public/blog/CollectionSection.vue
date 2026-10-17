<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'

import BlogItemCard from '@/components/blog/BlogItemCard.vue'
import BlogNoContent from '@/components/blog/BlogNoContent.vue'
import MarkdownContent from '@/components/blog/MarkdownContent.vue'
import { useBlogOwner } from '@/composables/useBlogOwner'
import { getPublicCollection } from '@/services/publicBlogApi'
import type { CollectionContent, PublicCollection, PublicSection } from '@/types/blog'

// Coleccion (Proyectos, Escritos, Libros...): intro + subsecciones con sus
// elementos + los que no tienen subseccion. Los elementos se piden aparte
// (sin cuerpos); el orden ya viene del backend segun `content.sort`.
const props = defineProps<{ section: PublicSection }>()

const owner = useBlogOwner()
const content = computed(() => props.section.content as unknown as CollectionContent)

const collection = shallowRef<PublicCollection | null>(null)
const error = ref(false)

watch(
  () => [owner.value?.username, props.section.slug] as const,
  async ([username, slug]) => {
    if (!username) return
    collection.value = null
    error.value = false
    try {
      collection.value = await getPublicCollection(username, slug)
    } catch {
      error.value = true
    }
  },
  { immediate: true },
)

const groups = computed(() => collection.value?.groups.filter((g) => g.items.length) ?? [])
const isEmpty = computed(
  () => collection.value !== null && !groups.value.length && !collection.value.ungrouped.length,
)
const listClass = computed(() =>
  content.value.layout === 'cards' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-6',
)
</script>

<template>
  <div class="space-y-10">
    <div>
      <h1 class="text-2xl font-semibold text-foreground">{{ section.label }}</h1>
      <MarkdownContent v-if="content.intro" :source="content.intro" class="mt-2 text-muted" />
    </div>

    <p v-if="error" class="text-sm text-ruby-text">No se pudo cargar esta sección.</p>
    <BlogNoContent v-else-if="isEmpty" />

    <template v-else-if="collection && owner">
      <section v-for="group in groups" :key="group.label">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">{{ group.label }}</h2>
        <p v-if="group.description" class="mt-1 text-sm text-muted">{{ group.description }}</p>
        <div class="mt-4" :class="listClass">
          <BlogItemCard
            v-for="item in group.items"
            :key="item.slug"
            :item="item"
            :username="owner.username"
            :section="section.slug"
            :layout="content.layout"
          />
        </div>
      </section>

      <section v-if="collection.ungrouped.length">
        <h2 v-if="groups.length" class="text-sm font-semibold uppercase tracking-wide text-muted">
          Otros
        </h2>
        <div :class="[listClass, { 'mt-4': groups.length }]">
          <BlogItemCard
            v-for="item in collection.ungrouped"
            :key="item.slug"
            :item="item"
            :username="owner.username"
            :section="section.slug"
            :layout="content.layout"
          />
        </div>
      </section>
    </template>
  </div>
</template>
