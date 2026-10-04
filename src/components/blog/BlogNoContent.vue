<script setup lang="ts">
import { FileText } from '@lucide/vue'

import EmptyState from '@/components/ui/EmptyState.vue'

// Seccion de un blog sin contenido. Hoy es el caso de todo blog salvo el del
// dueño del contenido de ejemplo (ver data/blogDemo.ts).
</script>

<template>
  <EmptyState
    :icon="FileText"
    title="Todavía no hay contenido"
    description="Esta sección del blog aún no tiene publicaciones."
  />
</template>
