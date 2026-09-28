<script setup lang="ts">
import { CalendarDays, CalendarRange, Tag, X } from '@lucide/vue'
import { computed, onMounted } from 'vue'

import { useExpenseOptions } from '@/composables/useExpenseOptions'
import { financeColorClasses } from '@/config/financeVisuals'
import { MONTH_SHORT_EN } from '@/lib/date'
import {
  daysInMonth,
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

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i)

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

const year = field('year')
const month = field('month')
const day = field('day')
const rangeStart = field('rangeStart')
const rangeEnd = field('rangeEnd')
const categoryId = field('categoryId')
const paymentMethodId = field('paymentMethodId')
const minAmount = field('minAmount')
const maxAmount = field('maxAmount')

const dayOptions = computed<number[]>(() => {
  const { year, month } = model.value
  if (!year || !month) return []
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1)
})

function toggleTag(tagId: number) {
  const current = model.value.tagIds
  update({
    tagIds: current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
  })
}

const hasExtraFilters = computed(() => hasExtraExpenseFilters(model.value))

function clearExtraFilters() {
  const defaults = defaultExpenseFilters()
  update({
    categoryId: defaults.categoryId,
    paymentMethodId: defaults.paymentMethodId,
    tagIds: defaults.tagIds,
    minAmount: defaults.minAmount,
    maxAmount: defaults.maxAmount,
  })
}

const CONTROL =
  'h-8 rounded-lg border border-subtle bg-surface px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-40'
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- Fecha: modo + controles del modo activo -->
    <span class="text-[11px] font-medium uppercase tracking-wide text-muted">Date</span>
    <div class="flex h-8 overflow-hidden rounded-lg border border-subtle text-xs">
      <button
        type="button"
        title="Filter by year / month / day"
        class="flex items-center gap-1 px-2 font-medium transition-colors"
        :class="
          model.dateMode === 'ymd'
            ? 'bg-accent/10 text-accent-text'
            : 'bg-surface text-muted hover:text-foreground'
        "
        @click="update({ dateMode: 'ymd' })"
      >
        <CalendarDays class="h-3.5 w-3.5" />
        Y/M/D
      </button>
      <button
        type="button"
        title="Filter by date range"
        class="flex items-center gap-1 border-l border-subtle px-2 font-medium transition-colors"
        :class="
          model.dateMode === 'range'
            ? 'bg-accent/10 text-accent-text'
            : 'bg-surface text-muted hover:text-foreground'
        "
        @click="update({ dateMode: 'range' })"
      >
        <CalendarRange class="h-3.5 w-3.5" />
        Range
      </button>
    </div>

    <template v-if="model.dateMode === 'ymd'">
      <select v-model="year" aria-label="Year" :class="CONTROL">
        <option :value="null">Any year</option>
        <option v-for="option in YEAR_OPTIONS" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
      <select v-model="month" aria-label="Month" :disabled="!model.year" :class="CONTROL">
        <option :value="null">Any month</option>
        <option v-for="(name, index) in MONTH_SHORT_EN" :key="name" :value="index + 1">
          {{ name }}
        </option>
      </select>
      <select v-model="day" aria-label="Day" :disabled="!model.month" :class="CONTROL">
        <option :value="null">Any day</option>
        <option v-for="option in dayOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
    </template>
    <template v-else>
      <input v-model="rangeStart" type="date" aria-label="From" :class="CONTROL" />
      <span class="text-xs text-muted">→</span>
      <input v-model="rangeEnd" type="date" aria-label="To" :class="CONTROL" />
    </template>

    <span class="mx-1 hidden h-5 w-px bg-subtle sm:block" />

    <!-- Resto de filtros, todos opcionales -->
    <select v-model="categoryId" aria-label="Category" :class="[CONTROL, 'max-w-40']">
      <option :value="null">All categories</option>
      <option v-for="category in categories" :key="category.id" :value="category.id">
        {{ category.name }}
      </option>
    </select>
    <select v-model="paymentMethodId" aria-label="Payment method" :class="[CONTROL, 'max-w-36']">
      <option :value="null">All methods</option>
      <option v-for="method in paymentMethods" :key="method.id" :value="method.id">
        {{ method.name }}
      </option>
    </select>

    <details class="relative">
      <summary
        :class="[
          CONTROL,
          'flex cursor-pointer list-none items-center gap-1.5 text-muted hover:text-foreground [&::-webkit-details-marker]:hidden',
          model.tagIds.length ? '!text-accent-text' : '',
        ]"
      >
        <Tag class="h-3.5 w-3.5" />
        {{ model.tagIds.length ? `${model.tagIds.length} tags` : 'Any tag' }}
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
            model.tagIds.includes(tag.id)
              ? [
                  financeColorClasses(tag.color_key).bg,
                  financeColorClasses(tag.color_key).text,
                  financeColorClasses(tag.color_key).border,
                ]
              : 'border-subtle text-muted hover:border-accent-text/50'
          "
          @click="toggleTag(tag.id)"
        >
          {{ tag.name }}
        </button>
      </div>
    </details>

    <!-- Rango de monto: .lazy para pedir a la API al confirmar, no por tecla -->
    <div
      class="flex h-8 items-center gap-1 rounded-lg border border-subtle bg-surface px-2 text-xs text-muted"
    >
      <span>$</span>
      <input
        v-model.lazy="minAmount"
        type="number"
        min="0"
        placeholder="Min"
        aria-label="Min amount"
        class="w-20 bg-transparent text-foreground outline-none"
      />
      <span>–</span>
      <input
        v-model.lazy="maxAmount"
        type="number"
        min="0"
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
