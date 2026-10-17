<script setup lang="ts">
import { FileText } from '@lucide/vue'

import EmptyState from '@/components/ui/EmptyState.vue'

// Seccion (o blog) sin nada publicado todavia.
withDefaults(defineProps<{ title?: string; description?: string }>(), {
  title: 'Todavía no hay contenido',
  description: 'Esta sección del blog aún no tiene publicaciones.',
})
</script>

<template>
  <EmptyState :icon="FileText" :title="title" :description="description" />
</template>
