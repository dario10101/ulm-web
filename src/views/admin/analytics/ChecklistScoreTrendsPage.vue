<script setup lang="ts">
import { ArrowLeft, ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import LineChart from '@/components/ui/LineChart.vue'
import { MONTH_NAMES_EN, formatShortDate, parseIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { getMonthlyAnalytics, getWeeklyAnalytics } from '@/services/checklistsApi'
import type {
  AnalyticsCategory,
  MonthlyAnalyticsRead,
  WeeklyAnalyticsRead,
} from '@/types/checklist'

type Timelapse = 'WEEKLY' | 'MONTHLY'

// Paleta categorica validada para fondo oscuro (skill dataviz), orden fijo:
// el backend ya devuelve las categorias en un orden estable (prioridad, con
// "Others" siempre al final), asi que el color sale de esa posicion, nunca
// del ranking de puntaje.
const CATEGORY_COLORS = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
]
// "Others" es un bucket agregado, no una categoria real: color neutro, no
// tomado de la paleta categorica.
const OTHERS_COLOR = '#A6A6A6'

function colorForCategory(category: AnalyticsCategory, index: number): string {
  return category.category_id === null
    ? OTHERS_COLOR
    : CATEGORY_COLORS[index % CATEGORY_COLORS.length]
}

const WEEK_WINDOW_SIZE = 12
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

const timelapse = ref<Timelapse>('WEEKLY')
const selectedYear = ref(CURRENT_YEAR)
const weekWindowStart = ref(0)

const loading = ref(false)
const error = ref<string | null>(null)
const weeklyData = ref<WeeklyAnalyticsRead | null>(null)
const monthlyData = ref<MonthlyAnalyticsRead | null>(null)

const allWeeks = computed(() => weeklyData.value?.weeks ?? [])

function resetWeekWindow() {
  weekWindowStart.value = Math.max(0, allWeeks.value.length - WEEK_WINDOW_SIZE)
}

async function loadWeekly(year: number) {
  loading.value = true
  error.value = null
  try {
    weeklyData.value = await getWeeklyAnalytics(year)
    resetWeekWindow()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not load weekly analytics.'
  } finally {
    loading.value = false
  }
}

async function loadMonthly(year: number) {
  loading.value = true
  error.value = null
  try {
    monthlyData.value = await getMonthlyAnalytics(year)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not load monthly analytics.'
  } finally {
    loading.value = false
  }
}

function load() {
  if (timelapse.value === 'WEEKLY') void loadWeekly(selectedYear.value)
  else void loadMonthly(selectedYear.value)
}

watch([timelapse, selectedYear], load)
onMounted(load)

const visibleWeeks = computed(() =>
  allWeeks.value.slice(weekWindowStart.value, weekWindowStart.value + WEEK_WINDOW_SIZE),
)

const canGoToPreviousWeeks = computed(() => weekWindowStart.value > 0)
const canGoToNextWeeks = computed(
  () => weekWindowStart.value + WEEK_WINDOW_SIZE < allWeeks.value.length,
)

function goToPreviousWeeks() {
  weekWindowStart.value = Math.max(0, weekWindowStart.value - WEEK_WINDOW_SIZE)
}
function goToNextWeeks() {
  const maxStart = Math.max(0, allWeeks.value.length - WEEK_WINDOW_SIZE)
  weekWindowStart.value = Math.min(maxStart, weekWindowStart.value + WEEK_WINDOW_SIZE)
}

const points = computed(() => {
  if (timelapse.value === 'MONTHLY') {
    return (monthlyData.value?.months ?? []).map((m) => ({
      label: MONTH_NAMES_EN[m.month - 1].slice(0, 3),
      sublabel: MONTH_NAMES_EN[m.month - 1],
    }))
  }
  // Numero secuencial dentro del anio (no ISO): las semanas del usuario son
  // rangos que el mismo elige, no siempre alineados a semana calendario, asi
  // que "cual semana cerrada del anio es esta" es mas util que un numero de
  // semana ISO. Se numera por posicion absoluta, no por la ventana visible,
  // para que no cambie al paginar.
  return visibleWeeks.value.map((week, indexInWindow) => ({
    label: `W${weekWindowStart.value + indexInWindow + 1}`,
    sublabel: `${formatShortDate(parseIsoDate(week.first_day))} - ${formatShortDate(parseIsoDate(week.last_day))}`,
  }))
})

const series = computed(() => {
  if (timelapse.value === 'MONTHLY') {
    const data = monthlyData.value
    if (!data) return []
    return data.categories.map((category, index) => ({
      id: category.category_id === null ? 'others' : String(category.category_id),
      label: category.name,
      color: colorForCategory(category, index),
      values: data.months.map((m) => m.scores[index] ?? 0),
    }))
  }
  const data = weeklyData.value
  if (!data) return []
  return data.categories.map((category, index) => ({
    id: category.category_id === null ? 'others' : String(category.category_id),
    label: category.name,
    color: colorForCategory(category, index),
    values: visibleWeeks.value.map((week) => week.scores[index] ?? 0),
  }))
})
</script>

<template>
  <div class="flex flex-col gap-6 sm:h-[calc(100vh-6.5rem)]">
    <div class="shrink-0">
      <RouterLink
        :to="{ name: 'admin-analytics' }"
        class="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft class="h-4 w-4" />
        Analytics
      </RouterLink>
      <h1 class="text-xl font-semibold text-foreground">Checklist trends</h1>
      <p class="text-sm text-muted">Score by category, from your closed checklist weeks.</p>
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-3">
      <div class="inline-flex rounded-lg border border-subtle bg-surface p-1 text-sm">
        <button
          type="button"
          class="rounded-md px-3 py-1.5 font-medium transition-colors"
          :class="
            timelapse === 'WEEKLY' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
          "
          @click="timelapse = 'WEEKLY'"
        >
          Weekly
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-1.5 font-medium transition-colors"
          :class="
            timelapse === 'MONTHLY' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
          "
          @click="timelapse = 'MONTHLY'"
        >
          Monthly
        </button>
      </div>

      <select
        v-model.number="selectedYear"
        class="rounded-lg border border-subtle bg-surface px-3 py-1.5 text-sm text-foreground"
      >
        <option v-for="year in YEAR_OPTIONS" :key="year" :value="year">{{ year }}</option>
      </select>
    </div>

    <BaseCard
      :title="timelapse === 'WEEKLY' ? 'Score per week' : 'Score per month'"
      class="sm:min-h-0 sm:flex-1 sm:overflow-y-auto"
    >
      <p v-if="loading" class="py-8 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="error" class="py-8 text-center text-sm text-ruby-text">{{ error }}</p>

      <template v-else-if="points.length">
        <LineChart
          :points="points"
          :series="series"
          show-average
          :y-axis-label="
            timelapse === 'WEEKLY' ? 'Weekly checklist score' : 'Monthly checklist score'
          "
        />

        <div v-if="timelapse === 'WEEKLY'" class="mt-4 flex items-center justify-between">
          <BaseButton
            variant="secondary"
            type="button"
            :disabled="!canGoToPreviousWeeks"
            @click="goToPreviousWeeks"
          >
            <ChevronLeft class="h-4 w-4" />
            Previous 12 weeks
          </BaseButton>
          <BaseButton
            variant="secondary"
            type="button"
            :disabled="!canGoToNextWeeks"
            @click="goToNextWeeks"
          >
            Next 12 weeks
            <ChevronRight class="h-4 w-4" />
          </BaseButton>
        </div>
      </template>
      <p v-else class="py-8 text-center text-sm text-muted">
        No closed weeks yet for {{ selectedYear }}.
      </p>
    </BaseCard>
  </div>
</template>
