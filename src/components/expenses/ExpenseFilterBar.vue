<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, onMounted } from 'vue'

import DateFilterControls from '@/components/finance/DateFilterControls.vue'
import MultiSelectMenu, { type MultiSelectOption } from '@/components/finance/MultiSelectMenu.vue'
import TagFilterMenu from '@/components/finance/TagFilterMenu.vue'
import { useExpenseOptions } from '@/composables/useExpenseOptions'
import { financeColorClasses } from '@/config/financeVisuals'
import {
  defaultExpenseFilters,
  hasExtraExpenseFilters,
  patchExpenseFilters,
  type ExpenseFilterState,
} from '@/lib/expenseFilters'

// Barra de filtros compacta (una fila en desktop, hace wrap en pantallas
// chicas). Emite un estado nuevo en cada cambio: quien la usa decide que
// pedir a la API con expenseFilterQuery().
const model = defineModel<ExpenseFilterState>({ required: true })

const { categories, paymentMethods, tags, ensureLoaded } = useExpenseOptions()
onMounted(ensureLoaded)

function update(patch: Partial<ExpenseFilterState>) {
  model.value = patchExpenseFilters(model.value, patch)
}

// Proxy get/set por campo para poder usar v-model en cada control sin mutar
// el objeto recibido.
function field<K extends keyof ExpenseFilterState>(key: K) {
  return computed<ExpenseFilterState[K]>({
    get: () => model.value[key],
    set: (value) => update({ [key]: value } as Partial<ExpenseFilterState>),
  })
}

const categoryIds = field('categoryIds')
const tagIds = field('tagIds')
const paymentMethodIds = field('paymentMethodIds')
const minAmount = field('minAmount')
const maxAmount = field('maxAmount')

const categoryOptions = computed<MultiSelectOption[]>(() =>
  categories.value.map((c) => ({
    id: c.id,
    label: c.name,
    colorClass: financeColorClasses(c.color_key).text,
  })),
)
const paymentMethodOptions = computed<MultiSelectOption[]>(() =>
  paymentMethods.value.map((m) => ({
    id: m.id,
    label: m.name,
    colorClass: financeColorClasses(m.color_key).text,
  })),
)

const hasExtraFilters = computed(() => hasExtraExpenseFilters(model.value))

function clearExtraFilters() {
  const defaults = defaultExpenseFilters()
  update({
    categoryIds: defaults.categoryIds,
    paymentMethodIds: defaults.paymentMethodIds,
    tagIds: defaults.tagIds,
    minAmount: defaults.minAmount,
    maxAmount: defaults.maxAmount,
  })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <DateFilterControls v-model="model" />

    <span class="mx-1 hidden h-5 w-px bg-subtle sm:block" />

    <!-- Resto de filtros, todos opcionales -->
    <MultiSelectMenu
      v-model="categoryIds"
      :options="categoryOptions"
      all-label="All categories"
      noun="categories"
      aria-label="Categories"
    />
    <MultiSelectMenu
      v-model="paymentMethodIds"
      :options="paymentMethodOptions"
      all-label="All methods"
      noun="methods"
      aria-label="Payment methods"
    />

    <TagFilterMenu v-model="tagIds" :tags="tags" />

    <!-- Rango de monto: .lazy para pedir a la API al confirmar, no por tecla -->
    <div
      class="flex h-8 items-center gap-1 rounded-lg border border-subtle bg-surface px-2 text-xs text-muted"
    >
      <span>$</span>
      <input
        v-model.lazy="minAmount"
        type="number"
        min="0"
        step="0.01"
        placeholder="Min"
        aria-label="Min amount"
        class="w-20 bg-transparent text-foreground outline-none"
      />
      <span>–</span>
      <input
        v-model.lazy="maxAmount"
        type="number"
        min="0"
        step="0.01"
        placeholder="Max"
        aria-label="Max amount"
        class="w-20 bg-transparent text-foreground outline-none"
      />
    </div>

    <button
      v-if="hasExtraFilters"
      type="button"
      title="Clear category, method, tag and amount filters"
      class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-ruby-text"
      @click="clearExtraFilters"
    >
      <X class="h-3.5 w-3.5" />
      Clear
    </button>
  </div>
</template>
