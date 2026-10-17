<script setup lang="ts">
import { ref, watch } from 'vue'

import { INPUT, LABEL } from './styles'

// Lista corta de textos (intereses, skills) escrita separada por comas. El
// texto se edita libre; la lista se recalcula al salir del campo.
const values = defineModel<string[]>({ required: true })

defineProps<{ label: string; max: number }>()

const text = ref(values.value.join(', '))
watch(values, (list) => {
  if (list.join(', ') !== text.value) text.value = list.join(', ')
})

function commit() {
  values.value = text.value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}
</script>

<template>
  <label class="block">
    <span :class="LABEL">{{ label }} (comma separated, up to {{ max }})</span>
    <input v-model="text" :class="INPUT" :aria-label="label" @blur="commit" @change="commit" />
  </label>
</template>
