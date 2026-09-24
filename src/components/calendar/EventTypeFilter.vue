<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { computed, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { allEventTypes, EVENT_TYPE_OPTIONS, type EventTypeValue } from '@/lib/eventTypes'

// Multi-seleccion con checks; "All" marca/desmarca todos los demas a la vez.
const selected = defineModel<Set<EventTypeValue>>({ required: true })

const menuOpen = ref(false)

const allSelected = computed(() => selected.value.size === EVENT_TYPE_OPTIONS.length)

const summaryLabel = computed(() => {
  if (allSelected.value) return 'All'
  if (selected.value.size === 0) return 'None'
  return `${selected.value.size} selected`
})

function toggleAll() {
  selected.value = allSelected.value ? new Set() : allEventTypes()
}

function toggle(value: EventTypeValue) {
  // Se reemplaza el Set entero en vez de mutarlo: Vue no rastrea el contenido
  // de un Set al asignarlo por v-model.
  const next = new Set(selected.value)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  selected.value = next
}
</script>

<template>
  <div class="relative">
    <BaseButton variant="secondary" type="button" @click="menuOpen = !menuOpen">
      {{ summaryLabel }}
      <ChevronDown class="h-4 w-4" />
    </BaseButton>
    <div v-if="menuOpen" class="fixed inset-0 z-10" @click="menuOpen = false" />
    <div
      v-if="menuOpen"
      class="absolute left-0 z-20 mt-1 w-48 rounded-lg border border-subtle bg-surface py-1 shadow-lg"
    >
      <label
        class="flex w-full cursor-pointer items-center gap-2 border-b border-subtle px-3 py-2 text-sm font-medium hover:bg-surface-hover"
      >
        <input type="checkbox" :checked="allSelected" @change="toggleAll" />
        All
      </label>
      <label
        v-for="option in EVENT_TYPE_OPTIONS"
        :key="option.value"
        class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-hover"
      >
        <input
          type="checkbox"
          :checked="selected.has(option.value)"
          @change="toggle(option.value)"
        />
        {{ option.label }}
      </label>
    </div>
  </div>
</template>
