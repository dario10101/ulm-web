<script setup lang="ts" generic="T">
import { Plus, Trash2 } from '@lucide/vue'

import { move } from '@/lib/reorder'

import MoveButtons from './MoveButtons.vue'

/**
 * Lista editable de filas de un formulario (destacados, experiencia, links...):
 * agregar, quitar y subir/bajar, con el mismo tope que el modelo del backend.
 * Cada fila se dibuja con el slot (recibe la fila, que se edita en el lugar).
 */
const rows = defineModel<T[]>({ required: true })

const props = defineProps<{
  label: string
  /** Nombre de una fila, para los botones ("highlight", "link"...). */
  noun: string
  max: number
  create: () => T
}>()

function add() {
  if (rows.value.length < props.max) rows.value = [...rows.value, props.create()]
}

function remove(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index)
}
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="mb-2 flex w-full items-center justify-between text-xs font-medium text-muted">
      <span>{{ label }} ({{ rows.length }}/{{ max }})</span>
    </legend>
    <div
      v-for="(row, index) in rows"
      :key="index"
      class="flex gap-2 rounded-lg border border-subtle p-3"
    >
      <div class="min-w-0 flex-1 space-y-2">
        <slot :row="row" :index="index" />
      </div>
      <div class="flex flex-col items-center gap-1">
        <MoveButtons
          :index="index"
          :count="rows.length"
          :label="`${noun} ${index + 1}`"
          @move="(delta) => (rows = move(rows, index, delta))"
        />
        <button
          type="button"
          class="rounded p-1 text-muted hover:bg-surface-hover hover:text-ruby-text"
          :aria-label="`Remove ${noun} ${index + 1}`"
          @click="remove(index)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline disabled:opacity-40 disabled:no-underline"
      :disabled="rows.length >= max"
      @click="add"
    >
      <Plus class="h-3.5 w-3.5" /> Add {{ noun }}
    </button>
  </fieldset>
</template>
