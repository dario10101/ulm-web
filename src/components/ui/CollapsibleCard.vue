<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { useId } from 'vue'

import { useCollapsed } from '@/composables/useCollapsed'

/**
 * BaseCard que se contrae desde su titulo. `storageKey` identifica el bloque
 * para recordar su estado por navegador (ver useCollapsed); arranca contraido.
 * El contenido se oculta con v-show, no se desmonta: contraer no descarta
 * cambios sin guardar de un formulario.
 */
const props = defineProps<{ title: string; storageKey: string }>()

const collapsed = useCollapsed(props.storageKey)
const bodyId = useId()
</script>

<template>
  <section class="rounded-xl border border-subtle bg-surface">
    <header class="flex items-center justify-between gap-2 px-5 py-4">
      <button
        type="button"
        class="-m-1 flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left hover:text-accent-text"
        :aria-expanded="!collapsed"
        :aria-controls="bodyId"
        @click="collapsed = !collapsed"
      >
        <ChevronDown
          class="h-4 w-4 shrink-0 text-muted transition-transform"
          :class="{ '-rotate-90': collapsed }"
        />
        <h3 class="truncate text-sm font-semibold text-foreground">{{ title }}</h3>
      </button>
      <div v-if="$slots.actions && !collapsed"><slot name="actions" /></div>
    </header>
    <div v-show="!collapsed" :id="bodyId" class="px-5 pb-5">
      <slot />
    </div>
  </section>
</template>
