<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, onMounted } from 'vue'

import TagFilterMenu from '@/components/finance/TagFilterMenu.vue'
import { useExpenseOptions } from '@/composables/useExpenseOptions'
import { MONTH_SHORT_EN } from '@/lib/date'
import {
  patchIncomeVsExpensesFilters,
  type IncomeVsExpensesFilters,
  type IncomeVsExpensesView,
} from '@/lib/incomeVsExpensesFilters'

// Barra de filtros de "Income vs expenses": misma ubicacion y estilo que las
// de Expenses/Income, pero cada vista muestra solo los controles que aplican
// (ver incomeVsExpensesFilters.ts). Los tags son los mismos de gastos e ingresos.
const props = defineProps<{ view: IncomeVsExpensesView }>()
const model = defineModel<IncomeVsExpensesFilters>({ required: true })

const { tags, ensureLoaded } = useExpenseOptions()
onMounted(ensureLoaded)

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i)

function field<K extends keyof IncomeVsExpensesFilters>(key: K) {
  return computed<IncomeVsExpensesFilters[K]>({
    get: () => model.value[key],
    set: (value) => {
      model.value = patchIncomeVsExpensesFilters(model.value, { [key]: value })
    },
  })
}

const year = field('year')
const month = field('month')
const tagIds = field('tagIds')
const tagId = field('tagId')

const showDate = computed(() => props.view !== 'year')
const showTags = computed(() => props.view !== 'tags')

const CONTROL =
  'h-8 rounded-lg border border-subtle bg-surface px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-40'
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <template v-if="showDate">
      <span class="text-[11px] font-medium uppercase tracking-wide text-muted">
        {{ view === 'month' ? 'Year' : 'Date' }}
      </span>
      <select v-model="year" aria-label="Year" data-test="year" :class="CONTROL">
        <option v-if="view !== 'month'" :value="null">Any year</option>
        <option v-for="option in YEAR_OPTIONS" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
      <select
        v-if="view === 'tags'"
        v-model="month"
        aria-label="Month"
        data-test="month"
        :disabled="!model.year"
        :class="CONTROL"
      >
        <option :value="null">Any month</option>
        <option v-for="(name, index) in MONTH_SHORT_EN" :key="name" :value="index + 1">
          {{ name }}
        </option>
      </select>
    </template>

    <!-- Por tags: un unico tag obligatorio (el pastel compara sus ingresos y gastos). -->
    <template v-if="view === 'tags'">
      <span class="mx-1 hidden h-5 w-px bg-subtle sm:block" />
      <span class="text-[11px] font-medium uppercase tracking-wide text-muted">Tag</span>
      <select
        v-model="tagId"
        aria-label="Tag"
        data-test="single-tag"
        :class="[CONTROL, 'max-w-44']"
      >
        <option v-if="!tags.length" :value="null" disabled>No tags yet</option>
        <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
      </select>
    </template>

    <span v-if="showDate && showTags" class="mx-1 hidden h-5 w-px bg-subtle sm:block" />

    <template v-if="showTags">
      <TagFilterMenu v-model="tagIds" :tags="tags" />
      <button
        v-if="model.tagIds.length"
        type="button"
        title="Clear tag filter"
        class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-ruby-text"
        @click="tagIds = []"
      >
        <X class="h-3.5 w-3.5" />
        Clear
      </button>
      <span class="text-[11px] text-muted">Tags apply to both incomes and expenses.</span>
    </template>
  </div>
</template>
