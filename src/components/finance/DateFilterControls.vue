<script setup lang="ts" generic="T extends DateFilterFields">
import { CalendarDays, CalendarRange } from '@lucide/vue'
import { computed } from 'vue'

import { MONTH_SHORT_EN } from '@/lib/date'
import { daysInMonth, patchExpenseFilters, type DateFilterFields } from '@/lib/expenseFilters'

// Controles de fecha de las barras de filtro de finanzas (gastos e ingresos):
// modo Y/M/D o rango. Generico sobre el estado completo de la barra para
// devolverlo entero (con la jerarquia anio > mes > dia aplicada).
// `withDay` en false oculta el dia: los intereses son registros mensuales.
// `singleYear`: solo un selector de año obligatorio (sin mes/dia ni rango),
// para vistas que muestran los meses de un año.
withDefaults(defineProps<{ withDay?: boolean; singleYear?: boolean }>(), {
  withDay: true,
  singleYear: false,
})

const model = defineModel<T>({ required: true })

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i)

function update(patch: Partial<DateFilterFields>) {
  model.value = patchExpenseFilters(model.value, patch as Partial<T>)
}

function field<K extends keyof DateFilterFields>(key: K) {
  return computed<DateFilterFields[K]>({
    get: () => model.value[key],
    set: (value) => update({ [key]: value }),
  })
}

const year = field('year')
const month = field('month')
const day = field('day')
const rangeStart = field('rangeStart')
const rangeEnd = field('rangeEnd')

const dayOptions = computed<number[]>(() => {
  const { year, month } = model.value
  if (!year || !month) return []
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1)
})

const CONTROL =
  'h-8 rounded-lg border border-subtle bg-surface px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-40'
</script>

<template>
  <span class="text-[11px] font-medium uppercase tracking-wide text-muted">
    {{ singleYear ? 'Year' : 'Date' }}
  </span>
  <select v-if="singleYear" v-model="year" aria-label="Year" :class="CONTROL">
    <option v-for="option in YEAR_OPTIONS" :key="option" :value="option">
      {{ option }}
    </option>
  </select>
  <div v-else class="flex h-8 overflow-hidden rounded-lg border border-subtle text-xs">
    <button
      type="button"
      :title="withDay ? 'Filter by year / month / day' : 'Filter by year / month'"
      class="flex items-center gap-1 px-2 font-medium transition-colors"
      :class="
        model.dateMode === 'ymd'
          ? 'bg-accent/10 text-accent-text'
          : 'bg-surface text-muted hover:text-foreground'
      "
      @click="update({ dateMode: 'ymd' })"
    >
      <CalendarDays class="h-3.5 w-3.5" />
      {{ withDay ? 'Y/M/D' : 'Y/M' }}
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

  <template v-if="singleYear" />
  <template v-else-if="model.dateMode === 'ymd'">
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
    <select v-if="withDay" v-model="day" aria-label="Day" :disabled="!model.month" :class="CONTROL">
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
</template>
