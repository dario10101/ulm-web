<script setup lang="ts">
import { ChevronDown, ChevronUp } from '@lucide/vue'

// Subir / bajar una fila (secciones, subsecciones, elementos, filas de un
// formulario). En los extremos el boton queda deshabilitado.
defineProps<{ index: number; count: number; label: string; disabled?: boolean }>()

const emit = defineEmits<{ move: [delta: -1 | 1] }>()
</script>

<template>
  <div class="flex shrink-0 items-center">
    <button
      type="button"
      class="rounded p-1 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
      :disabled="disabled || index === 0"
      :aria-label="`Move ${label} up`"
      @click="emit('move', -1)"
    >
      <ChevronUp class="h-4 w-4" />
    </button>
    <button
      type="button"
      class="rounded p-1 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
      :disabled="disabled || index === count - 1"
      :aria-label="`Move ${label} down`"
      @click="emit('move', 1)"
    >
      <ChevronDown class="h-4 w-4" />
    </button>
  </div>
</template>
