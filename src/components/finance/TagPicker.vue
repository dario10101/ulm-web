<script setup lang="ts">
import NewCatalogLink from '@/components/finance/NewCatalogLink.vue'
import { financeColorClasses } from '@/config/financeVisuals'
import type { ExpenseTagOption } from '@/types/expense'

// Multi-seleccion de tags de finanzas (los mismos para gastos e ingresos, y
// por usuario): el chip se colorea/descolorea al toggle. `manageType` (id de
// config/recordTypes.ts) muestra el enlace "+ New" a su panel de tags (solo en
// el alta: en la edicion no se sale del registro).
defineProps<{ tags: ExpenseTagOption[]; manageType?: string }>()

const selected = defineModel<number[]>({ required: true })

function toggle(tagId: number) {
  selected.value = selected.value.includes(tagId)
    ? selected.value.filter((id) => id !== tagId)
    : [...selected.value, tagId]
}
</script>

<template>
  <div class="text-sm">
    <!-- "+ New" en la linea del titulo (ver NewCatalogLink): no se mezcla con los chips. -->
    <div class="mb-2 flex items-center justify-between gap-2">
      <span class="text-muted">Tags (optional)</span>
      <NewCatalogLink v-if="manageType" :type="manageType" panel="tags" noun="tag" />
    </div>
    <p v-if="!tags.length" class="text-xs text-muted">No tags yet.</p>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="tag in tags"
        :key="tag.id"
        type="button"
        :data-test="`tag-${tag.id}`"
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
  </div>
</template>
