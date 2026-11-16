<script setup lang="ts">
import { computed } from 'vue'

import { linkIcon } from '@/config/blogLinks'

// Icono de un tipo de link: el de la marca (simple-icons, un solo <path> de
// 24x24 en el color del texto) o uno generico de lucide. Decorativo: el
// nombre del link lo da el texto o el aria-label de quien lo usa.
const props = defineProps<{ type: string }>()

const icon = computed(() => linkIcon(props.type))
</script>

<template>
  <svg
    v-if="icon.kind === 'brand'"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="icon.icon.path" />
  </svg>
  <component :is="icon.icon" v-else aria-hidden="true" />
</template>
