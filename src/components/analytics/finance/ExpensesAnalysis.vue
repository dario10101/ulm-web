<script setup lang="ts">
import { ReceiptText } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

import BarList from '@/components/charts/BarList.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ShareBar from '@/components/charts/ShareBar.vue'
import StackedColumnChart, { type StackedItem } from '@/components/charts/StackedColumnChart.vue'
import { FALLBACK_CHART_COLORS, type ChartItem } from '@/components/charts/types'
import ExpenseFilterBar from '@/components/expenses/ExpenseFilterBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { financeColorClasses, financeIcon } from '@/config/financeVisuals'
import { formatCOP, formatCompactCOP } from '@/lib/currency'
import { MONTH_SHORT_EN } from '@/lib/date'
import {
  defaultExpenseFilters,
  expenseDateRange,
  expenseFilterQuery,
  patchExpenseFilters,
  type ExpenseFilterState,
} from '@/lib/expenseFilters'
import { ApiError } from '@/lib/http'
import { summarizeExpenses } from '@/services/expensesApi'
import type { ExpenseGroupBy, ExpenseSummary, ExpenseSummaryBucket } from '@/types/expense'

import KpiTile from './KpiTile.vue'

// Vista real (con API) de "Finance analysis -> Expenses". El sub-analisis
// activo viene de la URL (ver FinanceAnalysisPage); aca solo se pide el
// agregado correspondiente al backend, con los mismos filtros de View records.
const props = defineProps<{ view: string }>()

const VIEW_GROUP_BY: Record<string, ExpenseGroupBy> = {
  category: 'category',
  tags: 'tag',
  'payment-methods': 'payment_method',
  month: 'month',
  year: 'year',
}
const groupBy = computed<ExpenseGroupBy>(() => VIEW_GROUP_BY[props.view] ?? 'category')

// A diferencia de View records (dia de hoy), el analisis arranca con el año
// en curso: un solo dia casi nunca da un grafico util.
const filters = ref<ExpenseFilterState>(defaultExpenseFilters(new Date(), 'year'))

// "Por mes" compara meses: si el filtro de fecha lo acota a un solo mes, el
// grafico seria una sola columna; al entrar se abre al año. "Por año" arranca
// con el año en curso (pedido explicito): para comparar años, "Any year".
watch(
  groupBy,
  (value) => {
    if (filters.value.dateMode !== 'ymd') return
    if (value === 'month' && filters.value.month) {
      filters.value = patchExpenseFilters(filters.value, { month: null })
    }
  },
  { immediate: true },
)

const summary = ref<ExpenseSummary | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let requestId = 0

async function fetchSummary() {
  // Si el usuario cambia filtros rapido, solo la ultima respuesta cuenta.
  const current = ++requestId
  loading.value = true
  error.value = null
  try {
    const result = await summarizeExpenses(groupBy.value, expenseFilterQuery(filters.value))
    if (current === requestId) summary.value = result
  } catch (err) {
    if (current === requestId) {
      error.value = err instanceof ApiError ? err.message : 'Could not load the analysis.'
    }
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch([groupBy, filters], fetchSummary, { immediate: true })

// --- Traduccion de buckets a items de grafico ---

function catalogItem(bucket: ExpenseSummaryBucket): ChartItem {
  return {
    key: bucket.key,
    label: bucket.label,
    value: bucket.total,
    colorClass: bucket.color_key
      ? financeColorClasses(bucket.color_key).text
      : 'text-slate-600 dark:text-slate-400',
    icon: bucket.icon_key ? financeIcon(bucket.icon_key) : undefined,
    meta: countLabel(bucket.count),
  }
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'expense' : 'expenses'}`
}

const catalogItems = computed<ChartItem[]>(() => (summary.value?.buckets ?? []).map(catalogItem))

// Meses: se rellenan los huecos (meses sin gastos = 0) para que el eje sea
// continuo; si hay un rango de fechas, se cubre ese rango completo.
const monthItems = computed<ChartItem[]>(() => {
  const buckets = summary.value?.buckets ?? []
  if (!buckets.length) return []
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  const range = expenseDateRange(filters.value)
  const first = (range.start ?? buckets[0].key).slice(0, 7)
  const last = (range.end ?? buckets[buckets.length - 1].key).slice(0, 7)
  const multiYear = first.slice(0, 4) !== last.slice(0, 4)

  const items: ChartItem[] = []
  let [year, month] = first.split('-').map(Number)
  const [lastYear, lastMonth] = last.split('-').map(Number)
  // Tope de seguridad por si llega un rango enorme (ej. 1990 -> hoy).
  while ((year < lastYear || (year === lastYear && month <= lastMonth)) && items.length < 120) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    const bucket = byKey.get(key)
    const name = MONTH_SHORT_EN[month - 1]
    items.push({
      key,
      label: multiYear ? `${name} ${String(year).slice(2)}` : name,
      value: bucket?.total ?? 0,
      meta: `${name} ${year} · ${countLabel(bucket?.count ?? 0)}`,
    })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return items
})

const yearItems = computed<ChartItem[]>(() => {
  const buckets = summary.value?.buckets ?? []
  if (!buckets.length) return []
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  const first = Number(buckets[0].key)
  const last = Number(buckets[buckets.length - 1].key)
  return Array.from({ length: last - first + 1 }, (_, i) => {
    const key = String(first + i)
    const bucket = byKey.get(key)
    return { key, label: key, value: bucket?.total ?? 0, meta: countLabel(bucket?.count ?? 0) }
  })
})

// --- Columnas apiladas por categoria (mes / año) ---

// Cuantas categorias se distinguen por color; el resto va a "Other". Con mas
// de ~8 colores los tonos se confunden y los segmentos chicos ni se ven.
const TOP_CATEGORIES = 7
const OTHER_KEY = '__other__'
const OTHER_COLOR = 'text-slate-500 dark:text-slate-400'

interface CategoryLegendEntry {
  key: string
  label: string
  total: number
  colorClass: string
}

/**
 * Categorias del periodo completo, de mayor a menor: las primeras
 * TOP_CATEGORIES con color propio y el resto sumado en "Other". El orden
 * es tambien el de apilado, asi cada categoria queda a la misma altura
 * relativa en todas las columnas.
 */
const categoryLegend = computed<CategoryLegendEntry[]>(() => {
  const totals = new Map<
    string,
    { key: string; label: string; colorKey: string | null; total: number }
  >()
  for (const bucket of summary.value?.buckets ?? []) {
    for (const segment of bucket.segments ?? []) {
      const entry = totals.get(segment.key) ?? {
        key: segment.key,
        label: segment.label,
        colorKey: segment.color_key,
        total: 0,
      }
      entry.total += segment.total
      totals.set(segment.key, entry)
    }
  }
  const sorted = [...totals.values()].sort((a, b) => b.total - a.total)
  const top = sorted.slice(0, TOP_CATEGORIES)
  const rest = sorted.slice(TOP_CATEGORIES)

  // Varias categorias comparten color en el catalogo (ej. dos "sky"): si ya
  // lo usa otra del top, se toma uno libre de la paleta de respaldo.
  const used = new Set<string>()
  const entries: CategoryLegendEntry[] = top.map((entry) => {
    let colorClass = entry.colorKey ? financeColorClasses(entry.colorKey).text : ''
    if (!colorClass || used.has(colorClass)) {
      colorClass = FALLBACK_CHART_COLORS.find((c) => !used.has(c)) ?? OTHER_COLOR
    }
    used.add(colorClass)
    return { key: entry.key, label: entry.label, total: entry.total, colorClass }
  })
  if (rest.length) {
    entries.push({
      key: OTHER_KEY,
      label: `Other (${rest.length})`,
      total: rest.reduce((sum, entry) => sum + entry.total, 0),
      colorClass: OTHER_COLOR,
    })
  }
  return entries
})

function toStacked(item: ChartItem): StackedItem {
  const bucket = summary.value?.buckets.find((b) => b.key === item.key)
  const byKey = new Map<string, number>()
  const topKeys = new Set(categoryLegend.value.map((e) => e.key))
  for (const segment of bucket?.segments ?? []) {
    const key = topKeys.has(segment.key) ? segment.key : OTHER_KEY
    byKey.set(key, (byKey.get(key) ?? 0) + segment.total)
  }
  return {
    key: item.key,
    label: item.label,
    meta: item.meta,
    segments: categoryLegend.value
      .filter((entry) => byKey.has(entry.key))
      .map((entry) => ({
        key: entry.key,
        label: entry.label,
        value: byKey.get(entry.key)!,
        colorClass: entry.colorClass,
      })),
  }
}

const stackedMonthItems = computed(() => monthItems.value.map(toStacked))
const stackedYearItems = computed(() => yearItems.value.map(toStacked))

function shareOf(value: number): string {
  const total = summary.value?.total ?? 0
  return total ? `${Math.round((value / total) * 100)}%` : '—'
}

const now = new Date()
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

// --- KPIs (dependen del tipo de agrupacion) ---

const kpis = computed(() => {
  const s = summary.value
  if (!s) return []
  const average = s.count ? s.total / s.count : 0
  const base = [
    { label: 'Total spent', value: formatCOP(s.total) },
    { label: 'Expenses', value: String(s.count) },
    { label: 'Average expense', value: formatCOP(average) },
  ]

  if (groupBy.value === 'month' || groupBy.value === 'year') {
    const periods = groupBy.value === 'month' ? monthItems.value : yearItems.value
    const top = [...periods].sort((a, b) => b.value - a.value)[0]
    const perPeriod = periods.length ? s.total / periods.length : 0
    return [
      ...base.slice(0, 2),
      {
        label: groupBy.value === 'month' ? 'Monthly average' : 'Yearly average',
        value: formatCOP(perPeriod),
      },
      { label: 'Highest', value: top ? formatCOP(top.value) : '—', hint: top?.meta },
    ]
  }

  const top = s.buckets[0]
  return [
    ...base,
    {
      label: groupBy.value === 'tag' ? 'Top tag' : 'Top',
      value: top ? top.label : '—',
      hint: top
        ? `${formatCOP(top.total)} · ${Math.round((top.total / (s.total || 1)) * 100)}%`
        : '',
    },
  ]
})

const untaggedShare = computed(() => {
  const s = summary.value
  const untagged = s?.buckets.find((b) => b.key === 'none')
  return s && untagged && s.total ? Math.round((untagged.total / s.total) * 100) : 0
})
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-subtle bg-surface/40 p-2">
      <ExpenseFilterBar v-model="filters" />
    </div>

    <p v-if="error" class="py-6 text-center text-sm text-ruby-text">{{ error }}</p>
    <p v-else-if="!summary && loading" class="py-10 text-center text-sm text-muted">Loading...</p>

    <EmptyState
      v-else-if="summary && !summary.count"
      :icon="ReceiptText"
      title="No expenses match these filters"
      description="Try widening the date or clearing some filters."
    />

    <div
      v-else-if="summary"
      class="space-y-4 transition-opacity"
      :class="loading ? 'opacity-60' : ''"
    >
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile v-for="kpi in kpis" :key="kpi.label" v-bind="kpi" />
      </div>

      <!-- Por categoria: parte de un todo con pocas porciones -> dona -->
      <BaseCard v-if="groupBy === 'category'" title="Spending by category">
        <DonutChart :items="catalogItems" :format="formatCOP" center-label="Total spent" />
      </BaseCard>

      <!-- Por tags: un gasto puede tener varios tags, no suman un todo -> ranking -->
      <BaseCard v-else-if="groupBy === 'tag'" title="Spending by tag">
        <template #actions>
          <span class="text-xs text-muted">An expense with several tags counts in each.</span>
        </template>
        <BarList :items="catalogItems" :format="formatCOP" :share-of="summary.total" />
        <p v-if="untaggedShare" class="mt-4 text-xs text-muted">
          {{ untaggedShare }}% of your spending has no tag.
        </p>
      </BaseCard>

      <!-- Por metodo de pago: pocas opciones -> barra apilada + tarjetas -->
      <BaseCard v-else-if="groupBy === 'payment_method'" title="Spending by payment method">
        <ShareBar :items="catalogItems" :format="formatCOP" />
      </BaseCard>

      <!-- Por mes/año: serie de tiempo -> columnas (+ promedio / variacion) -->
      <BaseCard v-else-if="groupBy === 'month'" title="Spending by month">
        <template #actions>
          <span class="flex items-center gap-1.5 text-xs text-muted">
            <span class="w-4 border-t border-dashed border-foreground/60" />
            Monthly average
          </span>
        </template>
        <StackedColumnChart
          :items="stackedMonthItems"
          :format="formatCOP"
          :axis-format="formatCompactCOP"
          :highlight-key="currentMonthKey"
          show-average
        />
        <ul class="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <li
            v-for="entry in categoryLegend"
            :key="entry.key"
            class="flex min-w-0 items-center gap-2"
            data-test="category-legend"
          >
            <span class="h-2.5 w-2.5 shrink-0 rounded-sm bg-current" :class="entry.colorClass" />
            <span class="min-w-0 flex-1 truncate text-foreground" :title="entry.label">
              {{ entry.label }}
            </span>
            <span class="text-muted">{{ shareOf(entry.total) }}</span>
            <span class="w-24 text-right tabular-nums text-foreground">
              {{ formatCOP(entry.total) }}
            </span>
          </li>
        </ul>
      </BaseCard>

      <BaseCard v-else title="Spending by year">
        <template #actions>
          <span class="text-xs text-muted">Change vs previous year</span>
        </template>
        <StackedColumnChart
          :items="stackedYearItems"
          :format="formatCOP"
          :axis-format="formatCompactCOP"
          :increase-is-good="false"
          show-delta
        />
        <ul class="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <li
            v-for="entry in categoryLegend"
            :key="entry.key"
            class="flex min-w-0 items-center gap-2"
            data-test="category-legend"
          >
            <span class="h-2.5 w-2.5 shrink-0 rounded-sm bg-current" :class="entry.colorClass" />
            <span class="min-w-0 flex-1 truncate text-foreground" :title="entry.label">
              {{ entry.label }}
            </span>
            <span class="text-muted">{{ shareOf(entry.total) }}</span>
            <span class="w-24 text-right tabular-nums text-foreground">
              {{ formatCOP(entry.total) }}
            </span>
          </li>
        </ul>
      </BaseCard>
    </div>
  </div>
</template>
