<script setup lang="ts">
import { Check } from '@lucide/vue'
import { computed } from 'vue'

import { filterEventCodes, normalizeEventCode } from '@/lib/userEvents'

/**
 * Tipo de un evento: lista de los tipos que el usuario ya uso, mas un campo
 * para escribir uno nuevo. Lo escrito pasa a mayusculas al vuelo y va
 * achicando la lista, para que se note enseguida si el tipo ya existe en vez
 * de crear un duplicado con otro nombre.
 */
const props = defineProps<{ codes: string[]; loading: boolean }>()

const code = defineModel<string>({ required: true })

const matches = computed(() => filterEventCodes(props.codes, code.value))
const normalized = computed(() => normalizeEventCode(code.value))
const isExisting = computed(() => props.codes.includes(normalized.value))

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  const upper = input.value.toUpperCase()
  if (upper !== input.value) {
    // Reescribir el valor manda el cursor al final: se restaura donde estaba,
    // para poder corregir una letra del medio sin pelear con el campo.
    const caret = input.selectionStart
    input.value = upper
    input.setSelectionRange(caret, caret)
  }
  code.value = upper
}
</script>

<template>
  <div class="text-sm">
    <label for="event-code" class="mb-1 block text-muted">Type</label>
    <input
      id="event-code"
      :value="code"
      type="text"
      maxlength="30"
      autocomplete="off"
      placeholder="Pick one below or write a new type"
      class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm uppercase"
      @input="onInput"
    />

    <div
      class="mt-1 max-h-28 overflow-y-auto rounded-lg border border-subtle bg-background p-1"
      role="listbox"
      aria-label="Existing event types"
    >
      <p v-if="loading" class="px-2 py-1 text-xs text-muted">Loading types...</p>
      <p v-else-if="!codes.length" class="px-2 py-1 text-xs text-muted">
        No types yet — write the first one above.
      </p>
      <p v-else-if="!matches.length" class="px-2 py-1 text-xs text-muted">
        No existing type matches.
      </p>
      <button
        v-for="option in matches"
        :key="option"
        type="button"
        role="option"
        :aria-selected="option === normalized"
        class="flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-surface-hover"
        :class="option === normalized ? 'font-medium text-accent-text' : 'text-foreground'"
        @click="code = option"
      >
        {{ option }}
        <Check v-if="option === normalized" class="h-3 w-3" />
      </button>
    </div>

    <p v-if="normalized && !isExisting" class="mt-1 text-xs text-muted">
      New type <span class="font-medium text-foreground">{{ normalized }}</span> will be created.
    </p>
  </div>
</template>
