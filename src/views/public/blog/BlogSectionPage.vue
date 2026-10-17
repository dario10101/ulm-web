<script setup lang="ts">
import { FileQuestion } from '@lucide/vue'
import { computed } from 'vue'

import EmptyState from '@/components/ui/EmptyState.vue'
import { useBlogOwner } from '@/composables/useBlogOwner'
import { BLOG_SECTION_VIEWS } from '@/config/blogSectionTypes'

// Una seccion del blog por su slug. Las secciones ya vienen con el blog
// (PublicLayout): las plantillas se pintan sin otro request; las colecciones
// piden sus elementos. La vista sale del registro de tipos.
const props = defineProps<{ section: string }>()

const owner = useBlogOwner()

const current = computed(() =>
  owner.value?.sections.find((section) => section.slug === props.section.toLowerCase()),
)
</script>

<template>
  <component
    :is="BLOG_SECTION_VIEWS[current.type]"
    v-if="current"
    :key="current.slug"
    :section="current"
  />
  <EmptyState
    v-else-if="owner"
    :icon="FileQuestion"
    title="Esta sección no existe"
    description="Puede que se haya renombrado o que su autor la haya desactivado."
  />
</template>
