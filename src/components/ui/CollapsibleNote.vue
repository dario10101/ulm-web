<script setup lang="ts">
import { X } from '@lucide/vue'
import { ref, watch } from 'vue'

// Nota opcional colapsada por defecto (mismo patron visual que "New expense").
// Se abre sola si el v-model ya trae texto (ej. al editar un registro), y
// cerrarla borra el texto: una nota oculta no deberia guardarse.
const note = defineModel<string>({ required: true })
const open = ref(note.value !== '')

watch(note, (value) => {
  if (value !== '') open.value = true
})

function close() {
  open.value = false
  note.value = ''
}
</script>

<template>
  <div class="text-sm">
    <button
      v-if="!open"
      type="button"
      class="text-xs font-medium text-accent-text hover:underline"
      @click="open = true"
    >
      + Add note
    </button>
    <div v-else>
      <div class="mb-1 flex max-w-md items-center justify-between">
        <span class="text-muted">Note (optional)</span>
        <button
          type="button"
          title="Remove note"
          class="rounded-md p-0.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
          @click="close"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        v-model="note"
        rows="2"
        maxlength="2000"
        class="w-full max-w-md rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
      />
    </div>
  </div>
</template>
