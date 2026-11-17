<script setup lang="ts">
import { computed } from 'vue'

import { linkIcon, linkIconColor } from '@/config/blogLinks'

// Icono de un tipo de link, en el color de su marca (ver linkIconColor): el
// de la marca (simple-icons, un solo <path> de 24x24) o uno generico de
// lucide. Decorativo: el nombre del link lo da el texto o el aria-label de
// quien lo usa.
const props = defineProps<{ type: string }>()

const icon = computed(() => linkIcon(props.type))
// Color de la marca; sin el (marcas negras, sitio web), el del texto.
const color = computed(() => linkIconColor(props.type) ?? undefined)
</script>

<template>
  <svg
    v-if="icon.kind === 'brand'"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    :style="{ color }"
  >
    <path :d="icon.icon.path" />
  </svg>
  <component :is="icon.icon" v-else aria-hidden="true" :style="{ color }" />
</template>
