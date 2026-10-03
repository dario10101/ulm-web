<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BaseCard from '@/components/ui/BaseCard.vue'
import LineChart from '@/components/ui/LineChart.vue'
import { MONTH_NAMES_EN, MONTH_SHORT_EN } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { summarizeWeights } from '@/services/weightsApi'
import type { WeightSummary, WeightSummaryGroupBy } from '@/types/weight'

type WeightView = 'year' | 'month' | 'all'

const VIEWS: { id: WeightView; label: string }[] = [
  { id: 'year', label: 'Yearly' },
  { id: 'month', label: 'Monthly' },
  { id: 'all', label: 'All' },
]

// Una sola serie: primer color de la paleta categorica (igual que checklists).
const SERIES_COLOR = '#3987e5'

const route = useRoute()
const router = useRouter()

// El rango vive en la URL (/admin/analytics/weight/month), igual patron que
// finance; sin rango o con uno invalido se corrige a "year".
const view = computed<WeightView>(
  () => VIEWS.find((option) => option.id === route.params.view)?.id ?? 'year',
)

watch(
  () => route.params.view,
  (value) => {
    if (value !== view.value) {
      router.replace({ name: 'admin-analytics-weight', params: { view: view.value } })
    }
  },
  { immediate: true },
)

function onSelectView(event: Event) {
  const id = (event.target as HTMLSelectElement).value
  router.push({ name: 'admin-analytics-weight', params: { view: id } })
}

const today = new Date()
const selectedYear = ref(today.getFullYear())
const selectedMonth = ref(today.getMonth() + 1)

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

const GROUP_BY: Record<WeightView, WeightSummaryGroupBy> = {
  year: 'month',
  month: 'day',
  all: 'year',
}

// "All" no acota fechas: un promedio por año de todo el historial.
const range = computed(() => {
  if (view.value === 'all') return {}
  const year = selectedYear.value
  if (view.value === 'year') return { startDate: `${year}-01-01`, endDate: `${year}-12-31` }
  const month = pad(selectedMonth.value)
  const lastDay = daysInMonth(year, selectedMonth.value)
  return { startDate: `${year}-${month}-01`, endDate: `${year}-${month}-${pad(lastDay)}` }
})

const summary = ref<WeightSummary | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let requestId = 0

async function fetchSummary() {
  // Si el usuario cambia filtros rapido, solo la ultima respuesta cuenta.
  const current = ++requestId
  loading.value = true
  error.value = null
  try {
    const result = await summarizeWeights(GROUP_BY[view.value], range.value)
    if (current === requestId) summary.value = result
  } catch (err) {
    if (current === requestId) {
      error.value = err instanceof ApiError ? err.message : 'Could not load the analysis.'
    }
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch([view, range], fetchSummary, { immediate: true })

// Años con datos + el seleccionado + el actual (para poder mirar el año en
// curso aunque todavia no tenga pesajes).
const yearOptions = computed(() => {
  const years = new Set([
    ...(summary.value?.available_years ?? []),
    selectedYear.value,
    today.getFullYear(),
  ])
  return [...years].sort((a, b) => b - a)
})

// Eje X completo (todos los años entre el primero y el ultimo con pesaje,
// 12 meses, o todos los dias del mes); los periodos sin pesaje quedan en null
// y la linea los salta.
const chart = computed(() => {
  const buckets = summary.value?.buckets ?? []
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  const year = selectedYear.value

  if (view.value === 'all') {
    if (!buckets.length) return finish([])
    const first = Number(buckets[0].key)
    const last = Number(buckets[buckets.length - 1].key)
    const points = Array.from({ length: last - first + 1 }, (_, i) => {
      const key = String(first + i)
      const bucket = byKey.get(key)
      return {
        label: key,
        sublabel: countLabel(bucket?.count ?? 0),
        value: bucket?.average_kg ?? null,
      }
    })
    return finish(points)
  }

  if (view.value === 'year') {
    const points = MONTH_SHORT_EN.map((label, i) => {
      const bucket = byKey.get(`${year}-${pad(i + 1)}`)
      return {
        label,
        sublabel: `${MONTH_NAMES_EN[i]} ${year} · ${countLabel(bucket?.count ?? 0)}`,
        value: bucket?.average_kg ?? null,
      }
    })
    return finish(points)
  }

  const month = selectedMonth.value
  const points = Array.from({ length: daysInMonth(year, month) }, (_, i) => {
    const day = i + 1
    const bucket = byKey.get(`${year}-${pad(month)}-${pad(day)}`)
    return {
      label: String(day),
      sublabel: `${MONTH_SHORT_EN[month - 1]} ${day}, ${year} · ${countLabel(bucket?.count ?? 0)}`,
      value: bucket?.average_kg ?? null,
    }
  })
  return finish(points)
})

function finish(points: { label: string; sublabel: string; value: number | null }[]) {
  return {
    points: points.map(({ label, sublabel }) => ({ label, sublabel })),
    series: [
      {
        id: 'weight',
        label: 'Average weight',
        color: SERIES_COLOR,
        values: points.map((p) => p.value),
      },
    ],
  }
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'weigh-in' : 'weigh-ins'}`
}

function formatKg(value: number): string {
  return `${value.toFixed(1)} kg`
}

const periodLabel = computed(() => {
  if (view.value === 'all') return 'All time'
  if (view.value === 'year') return String(selectedYear.value)
  return `${MONTH_NAMES_EN[selectedMonth.value - 1]} ${selectedYear.value}`
})

const CHART_TITLES: Record<WeightView, string> = {
  year: 'Average weight per month',
  month: 'Average weight per day',
  all: 'Average weight per year',
}
const chartTitle = computed(() => CHART_TITLES[view.value])

const SELECT_CLASS = 'h-9 rounded-lg border border-subtle bg-surface px-3 text-sm text-foreground'
// Mismo estilo compacto que los controles de la barra de filtros de finance.
const CONTROL = 'h-8 rounded-lg border border-subtle bg-surface px-2 text-xs text-foreground'
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <RouterLink
          :to="{ name: 'admin-analytics' }"
          class="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft class="h-4 w-4" />
          Analytics
        </RouterLink>
        <h1 class="text-xl font-semibold text-foreground">Weight trend</h1>
        <p class="text-sm text-muted">Average weight per day, per month or across all years.</p>
      </div>

      <label class="text-sm">
        <span class="mb-1 block text-xs text-muted">Range</span>
        <select :value="view" :class="SELECT_CLASS" @change="onSelectView">
          <option v-for="option in VIEWS" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <!-- Filtros debajo del encabezado, igual ubicacion que expenses/income.
         "All" no tiene filtros: siempre es todo el historial. -->
    <div v-if="view !== 'all'" class="rounded-xl border border-subtle bg-surface/40 p-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[11px] font-medium uppercase tracking-wide text-muted">Date</span>
        <select v-model.number="selectedYear" aria-label="Year" :class="CONTROL">
          <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
        </select>
        <select
          v-if="view === 'month'"
          v-model.number="selectedMonth"
          aria-label="Month"
          :class="CONTROL"
        >
          <option v-for="(name, index) in MONTH_SHORT_EN" :key="name" :value="index + 1">
            {{ name }}
          </option>
        </select>
      </div>
    </div>

    <BaseCard :title="chartTitle">
      <p v-if="loading && !summary" class="py-8 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="error" class="py-8 text-center text-sm text-ruby-text">{{ error }}</p>

      <template v-else-if="summary?.count">
        <p class="mb-3 text-sm text-muted">
          {{ periodLabel }}:
          <span class="font-semibold text-foreground">{{ formatKg(summary.average_kg!) }}</span>
          average · {{ countLabel(summary.count) }}
        </p>
        <LineChart
          :points="chart.points"
          :series="chart.series"
          :format="formatKg"
          show-markers
          :x-label-every="view === 'month' ? 2 : 1"
          :y-axis-label="chartTitle"
        />
      </template>
      <p v-else class="py-8 text-center text-sm text-muted">
        No weigh-ins recorded for {{ periodLabel }}.
      </p>
    </BaseCard>
  </div>
</template>
