<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed } from 'vue'

import DateFilterControls from '@/components/finance/DateFilterControls.vue'
import TagFilterMenu from '@/components/finance/TagFilterMenu.vue'
import { useIncomeOptions } from '@/composables/useIncomeOptions'
import { patchExpenseFilters } from '@/lib/expenseFilters'
import {
  defaultIncomeFilters,
  hasExtraIncomeFilters,
  type IncomeFilterState,
} from '@/lib/incomeFilters'
import type { IncomeKind } from '@/types/income'

// Barra de filtros de "View records -> Income", analoga a ExpenseFilterBar.
// Las fuentes se limitan a las que aplican al tipo; las subcategorias, a las
// de la fuente filtrada (o a las de todas sus fuentes si no hay ninguna).
const props = defineProps<{ kind: IncomeKind }>()
const model = defineModel<IncomeFilterState>({ required: true })

const { tags, sourcesFor, subcategoriesFor, subcategoriesOf, sourceName } = useIncomeOptions()
const sources = sourcesFor(() => props.kind)
const allSubcategories = subcategoriesFor(() => props.kind)
const sourceSubcategories = subcategoriesOf(() => model.value.sourceId)
const subcategories = computed(() =>
  model.value.sourceId === null ? allSubcategories.value : sourceSubcategories.value,
)

function update(patch: Partial<IncomeFilterState>) {
  const next = patchExpenseFilters(model.value, patch)
  // Una subcategoria de otra fuente nunca coincidiria: se limpia al cambiar de fuente.
  if (
    'sourceId' in patch &&
    next.sourceId !== null &&
    next.subcategoryId !== null &&
    !subcategoriesOf(next.sourceId).value.some((s) => s.id === next.subcategoryId)
  ) {
    next.subcategoryId = null
  }
  model.value = next
}

function field<K extends keyof IncomeFilterState>(key: K) {
  return computed<IncomeFilterState[K]>({
    get: () => model.value[key],
    set: (value) => update({ [key]: value } as Partial<IncomeFilterState>),
  })
}

const sourceId = field('sourceId')
const subcategoryId = field('subcategoryId')
const tagIds = field('tagIds')
const minAmount = field('minAmount')
const maxAmount = field('maxAmount')

const hasExtraFilters = computed(() => hasExtraIncomeFilters(model.value))

function clearExtraFilters() {
  const { sourceId, subcategoryId, tagIds, minAmount, maxAmount } = defaultIncomeFilters()
  update({ sourceId, subcategoryId, tagIds, minAmount, maxAmount })
}

const CONTROL =
  'h-8 rounded-lg border border-subtle bg-surface px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-40'
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <DateFilterControls v-model="model" :with-day="kind === 'direct'" />

    <span class="mx-1 hidden h-5 w-px bg-subtle sm:block" />

    <select v-model="sourceId" aria-label="Source" :class="[CONTROL, 'max-w-40']">
      <option :value="null">All sources</option>
      <option v-for="source in sources" :key="source.id" :value="source.id">
        {{ source.name }}
      </option>
    </select>
    <select v-model="subcategoryId" aria-label="Subcategory" :class="[CONTROL, 'max-w-40']">
      <option :value="null">All subcategories</option>
      <!-- Sin fuente elegida se aclara de cual es cada una: hay nombres repetidos (EXTRA). -->
      <option v-for="subcategory in subcategories" :key="subcategory.id" :value="subcategory.id">
        {{
          sourceId === null
            ? `${subcategory.name} · ${sourceName(subcategory.source_id)}`
            : subcategory.name
        }}
      </option>
    </select>

    <TagFilterMenu v-model="tagIds" :tags="tags" />

    <!-- .lazy: pedir a la API al confirmar, no por tecla. Sin min=0 en
         intereses: un mes puede ser negativo y filtrarse como tal. -->
    <div
      class="flex h-8 items-center gap-1 rounded-lg border border-subtle bg-surface px-2 text-xs text-muted"
    >
      <span>$</span>
      <input
        v-model.lazy="minAmount"
        type="number"
        :min="kind === 'direct' ? 0 : undefined"
        step="0.01"
        placeholder="Min"
        aria-label="Min amount"
        class="w-20 bg-transparent text-foreground outline-none"
      />
      <span>–</span>
      <input
        v-model.lazy="maxAmount"
        type="number"
        :min="kind === 'direct' ? 0 : undefined"
        step="0.01"
        placeholder="Max"
        aria-label="Max amount"
        class="w-20 bg-transparent text-foreground outline-none"
      />
    </div>

    <button
      v-if="hasExtraFilters"
      type="button"
      title="Clear source, subcategory, tag and amount filters"
      class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-ruby-text"
      @click="clearExtraFilters"
    >
      <X class="h-3.5 w-3.5" />
      Clear
    </button>
  </div>
</template>
