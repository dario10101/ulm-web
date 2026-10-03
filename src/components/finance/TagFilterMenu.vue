<script setup lang="ts">
import { Tag } from '@lucide/vue'

import { financeColorClasses } from '@/config/financeVisuals'
import type { ExpenseTagOption } from '@/types/expense'

// Filtro por tags de las barras de finanzas: desplegable (<details>) para no
// ocupar una fila entera con chips. Coincide si el registro tiene alguno.
defineProps<{ tags: ExpenseTagOption[] }>()

const selected = defineModel<number[]>({ required: true })

function toggle(tagId: number) {
  selected.value = selected.value.includes(tagId)
    ? selected.value.filter((id) => id !== tagId)
    : [...selected.value, tagId]
}
</script>

<template>
  <details class="relative">
    <summary
      class="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-subtle bg-surface px-2 text-xs text-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
      :class="selected.length ? '!text-accent-text' : ''"
    >
      <Tag class="h-3.5 w-3.5" />
      {{ selected.length ? `${selected.length} tags` : 'Any tag' }}
    </summary>
    <div
      class="absolute z-20 mt-1 flex w-max max-w-64 flex-wrap gap-1.5 rounded-lg border border-subtle bg-surface p-2 shadow-lg"
    >
      <p v-if="!tags.length" class="text-xs text-muted">No tags yet.</p>
      <button
        v-for="tag in tags"
        :key="tag.id"
        type="button"
        class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
        :class="
          selected.includes(tag.id)
            ? [
                financeColorClasses(tag.color_key).bg,
                financeColorClasses(tag.color_key).text,
                financeColorClasses(tag.color_key).border,
              ]
            : 'border-subtle text-muted hover:border-accent-text/50'
        "
        @click="toggle(tag.id)"
      >
        {{ tag.name }}
      </button>
    </div>
  </details>
</template>
