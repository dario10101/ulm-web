<script setup lang="ts">
import { FileQuestion } from '@lucide/vue'
import { computed } from 'vue'

import BlogLinkList from '@/components/blog/BlogLinkList.vue'
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
  <!-- Un solo nodo raiz: la ruta pasa `username` como atributo. -->
  <div v-if="current">
    <component :is="BLOG_SECTION_VIEWS[current.type]" :key="current.slug" :section="current" />
    <!-- Links "al final" de la plantilla (antes del pie global): igual en
         todos los tipos, por eso van aca y no en cada vista. -->
    <BlogLinkList :links="current.links.end" variant="end" class="mt-16" />
  </div>
  <EmptyState
    v-else-if="owner"
    :icon="FileQuestion"
    title="Esta sección no existe"
    description="Puede que se haya renombrado o que su autor la haya desactivado."
  />
</template>
