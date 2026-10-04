<script setup lang="ts">
import { TrendingUp } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'

import DonutChart from '@/components/charts/DonutChart.vue'
import ShareBar from '@/components/charts/ShareBar.vue'
import StackedColumnChart, {
  type StackSegment,
  type StackedItem,
} from '@/components/charts/StackedColumnChart.vue'
import type { ChartItem } from '@/components/charts/types'
import IncomeAnalysisFilterBar from '@/components/income/IncomeAnalysisFilterBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useIncomeOptions } from '@/composables/useIncomeOptions'
import { financeColorClasses } from '@/config/financeVisuals'
import { formatCOP, formatCompactCOP } from '@/lib/currency'
import { MONTH_SHORT_EN } from '@/lib/date'
import { expenseDateRange } from '@/lib/expenseFilters'
import { ApiError } from '@/lib/http'
import {
  VIEW_GROUP_BY,
  defaultIncomeAnalysisFilters,
  filtersForView,
  incomeAnalysisQuery,
  stackDimension,
  type IncomeAnalysisFilters,
  type IncomeAnalysisView,
} from '@/lib/incomeAnalysisFilters'
import { sourceColor, subcategoryColor } from '@/lib/incomeColors'
import { summarizeIncomes } from '@/services/incomesApi'
import type { IncomeSummary, IncomeSummaryBucket } from '@/types/income'

import KpiTile from './KpiTile.vue'

// "Finance analysis -> Income" (directos + intereses). La vista viene de la
// URL (ver FinanceAnalysisPage); aca se piden los agregados al backend.
const props = defineProps<{ view: string }>()

const VIEWS: IncomeAnalysisView[] = ['source', 'subcategory', 'tags', 'year', 'month']
const view = computed<IncomeAnalysisView>(() =>
  VIEWS.includes(props.view as IncomeAnalysisView) ? (props.view as IncomeAnalysisView) : 'source',
)

const { sources, subcategories, ensureLoaded } = useIncomeOptions()
onMounted(ensureLoaded)

const filters = ref<IncomeAnalysisFilters>(defaultIncomeAnalysisFilters())

// Cada vista tiene sus reglas de filtro (ver filtersForView). Se reaplican al
// cambiar de vista y cuando llegan las fuentes (la vista por subcategoria
// necesita una por defecto).
watch(
  [view, () => sources.value.length],
  () => {
    const firstSource = [...sources.value].sort((a, b) => a.id - b.id)[0]?.id ?? null
    filters.value = filtersForView(filters.value, view.value, firstSource)
  },
  { immediate: true },
)

// Por subcategoria sin una fuente todavia (opciones cargando) no hay nada que pedir.
const ready = computed(() => view.value !== 'subcategory' || filters.value.sourceIds.length === 1)

const summary = ref<IncomeSummary | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let requestId = 0

async function fetchSummary() {
  if (!ready.value) return
  // Si el usuario cambia filtros rapido, solo la ultima respuesta cuenta.
  const current = ++requestId
  loading.value = true
  error.value = null
  try {
    const result = await summarizeIncomes(
      VIEW_GROUP_BY[view.value],
      incomeAnalysisQuery(filters.value, view.value),
    )
    if (current === requestId) summary.value = result
  } catch (err) {
    if (current === requestId) {
      error.value = err instanceof ApiError ? err.message : 'Could not load the analysis.'
    }
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch([view, filters], fetchSummary, { immediate: true })

// --- Colores y etiquetas ---

function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'income' : 'incomes'}`
}

function percentOf(value: number, total: number): string {
  return total ? `${Math.round((value / total) * 100)}%` : '—'
}

function bucketColor(bucket: IncomeSummaryBucket): string {
  if (view.value === 'source') return sourceColor(sources.value, Number(bucket.key))
  if (view.value === 'subcategory') return subcategoryColor(subcategories.value, Number(bucket.key))
  if (bucket.color_key) return financeColorClasses(bucket.color_key).text
  return 'text-slate-600 dark:text-slate-400'
}

const catalogItems = computed<ChartItem[]>(() =>
  (summary.value?.buckets ?? []).map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: bucket.total,
    colorClass: bucketColor(bucket),
    meta: countLabel(bucket.count),
  })),
)

// --- Series de tiempo (columnas apiladas) ---

const stackBy = computed(() => summary.value?.stack_by ?? stackDimension(filters.value))

function segmentColor(key: string): string {
  return stackBy.value === 'subcategory'
    ? subcategoryColor(subcategories.value, Number(key))
    : sourceColor(sources.value, Number(key))
}

/**
 * Leyenda/desglose del periodo completo: un renglon por segmento con su
 * total. Su orden (mayor a menor) es tambien el orden de apilado, para que
 * cada fuente quede a la misma altura relativa en todas las columnas.
 */
const legend = computed(() => {
  const totals = new Map<string, { key: string; label: string; total: number }>()
  for (const bucket of summary.value?.buckets ?? []) {
    for (const segment of bucket.segments) {
      const entry = totals.get(segment.key) ?? { key: segment.key, label: segment.label, total: 0 }
      entry.total += segment.total
      totals.set(segment.key, entry)
    }
  }
  return [...totals.values()]
    .sort((a, b) => b.total - a.total)
    .map((entry) => ({ ...entry, colorClass: segmentColor(entry.key) }))
})

function toStacked(key: string, label: string, meta: string, bucket?: IncomeSummaryBucket) {
  const byKey = new Map((bucket?.segments ?? []).map((s) => [s.key, s.total]))
  const segments: StackSegment[] = legend.value
    .filter((entry) => byKey.has(entry.key))
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      value: byKey.get(entry.key)!,
      colorClass: entry.colorClass,
    }))
  return { key, label, meta: `${meta} · ${countLabel(bucket?.count ?? 0)}`, segments }
}

// Mes: siempre los 12 meses del año elegido (meses sin ingresos = columna vacia).
const selectedYear = computed(() => filters.value.year ?? new Date().getFullYear())
const monthItems = computed<StackedItem[]>(() => {
  const byKey = new Map((summary.value?.buckets ?? []).map((b) => [b.key, b]))
  return MONTH_SHORT_EN.map((name, index) => {
    const key = `${selectedYear.value}-${String(index + 1).padStart(2, '0')}`
    return toStacked(key, name, `${name} ${selectedYear.value}`, byKey.get(key))
  })
})

// Año: del primero al ultimo con datos (o el rango filtrado), sin huecos.
const yearItems = computed<StackedItem[]>(() => {
  const buckets = summary.value?.buckets ?? []
  if (!buckets.length) return []
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  const range = expenseDateRange(filters.value)
  const first = Number(range.start?.slice(0, 4) ?? buckets[0].key)
  const last = Number(range.end?.slice(0, 4) ?? buckets[buckets.length - 1].key)
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => {
    const key = String(first + i)
    return toStacked(key, key, key, byKey.get(key))
  })
})

const periodItems = computed(() => (view.value === 'month' ? monthItems.value : yearItems.value))

function periodTotal(item: StackedItem): number {
  return item.segments.reduce((sum, s) => sum + s.value, 0)
}

const now = new Date()
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

// Meses que cuentan para promedios: en el año en curso solo los transcurridos
// (promediar contra 12 subestimaria el ingreso mensual real).
const elapsedMonths = computed(() =>
  selectedYear.value === now.getFullYear()
    ? now.getMonth() + 1
    : selectedYear.value > now.getFullYear()
      ? 0
      : 12,
)

// --- KPIs ---

interface Kpi {
  label: string
  value: string
  hint?: string
}

const kpis = computed<Kpi[]>(() => {
  const s = summary.value
  if (!s) return []
  const result: Kpi[] = [
    { label: 'Total income', value: formatCOP(s.total), hint: countLabel(s.count) },
  ]

  // Ingreso pasivo: cuanto del total viene de intereses (solo tiene sentido con ambos tipos).
  if (filters.value.kind === 'all') {
    result.push({
      label: 'Passive income',
      value: formatCOP(s.interest_total),
      hint: `${percentOf(s.interest_total, s.total)} of the total comes from interest`,
    })
  }

  if (view.value === 'month') {
    const months = elapsedMonths.value
    const average = months ? s.total / months : 0
    const best = [...monthItems.value].sort((a, b) => periodTotal(b) - periodTotal(a))[0]
    result.push({
      label: 'Monthly average',
      value: formatCOP(average),
      hint: months < 12 && months > 0 ? `Over ${months} elapsed months` : undefined,
    })
    result.push(
      selectedYear.value === now.getFullYear() && months < 12
        ? {
            label: 'Year projection',
            value: formatCOP(average * 12),
            hint: 'At the current monthly average',
          }
        : {
            label: 'Best month',
            value: best && periodTotal(best) ? formatCOP(periodTotal(best)) : '—',
            hint: best?.meta,
          },
    )
    return result.slice(0, 4)
  }

  if (view.value === 'year') {
    const years = yearItems.value
    const best = [...years].sort((a, b) => periodTotal(b) - periodTotal(a))[0]
    result.push({
      label: 'Yearly average',
      value: formatCOP(years.length ? s.total / years.length : 0),
    })
    result.push({
      label: 'Best year',
      value: best ? best.label : '—',
      hint: best ? formatCOP(periodTotal(best)) : undefined,
    })
    return result.slice(0, 4)
  }

  const top = s.buckets.find((b) => b.key !== 'none')
  const topLabel = { source: 'Top source', subcategory: 'Top subcategory', tags: 'Top tag' }[
    view.value
  ]
  result.push({
    label: topLabel,
    value: top ? top.label : '—',
    hint: top ? `${formatCOP(top.total)} · ${percentOf(top.total, s.total)}` : undefined,
  })
  if (result.length < 4) {
    result.push({
      label: 'Average income',
      value: formatCOP(s.count ? s.total / s.count : 0),
    })
  }
  return result
})

// --- Extras por vista ---

const kindItems = computed<ChartItem[]>(() => {
  const s = summary.value
  if (!s) return []
  return [
    {
      key: 'direct',
      label: 'Direct',
      value: s.direct_total,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'interest',
      label: 'Interest',
      value: s.interest_total,
      colorClass: 'text-sky-600 dark:text-sky-400',
    },
  ]
})
const showKindSplit = computed(
  () =>
    filters.value.kind === 'all' &&
    (summary.value?.direct_total ?? 0) > 0 &&
    (summary.value?.interest_total ?? 0) > 0,
)

// Tags: un ingreso con varios tags aparece en cada porcion, asi que la dona
// puede sumar mas que el total real; se avisa cuando pasa.
const tagOverlap = computed(() => {
  const s = summary.value
  if (!s || view.value !== 'tags') return false
  return s.buckets.reduce((sum, b) => sum + b.total, 0) > s.total + 0.005
})
const untaggedShare = computed(() => {
  const s = summary.value
  const untagged = s?.buckets.find((b) => b.key === 'none')
  return s && untagged ? percentOf(untagged.total, s.total) : null
})

// Valores negativos (un año con perdida neta en intereses) no caben en una dona.
const hiddenNegative = computed(() => catalogItems.value.filter((item) => item.value <= 0))

const selectedSourceName = computed(
  () => sources.value.find((s) => s.id === filters.value.sourceIds[0])?.name ?? '',
)
const stackNoun = computed(() => (stackBy.value === 'subcategory' ? 'subcategory' : 'source'))
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-subtle bg-surface/40 p-2">
      <IncomeAnalysisFilterBar v-model="filters" :view="view" />
    </div>

    <p v-if="error" class="py-6 text-center text-sm text-ruby-text">{{ error }}</p>
    <p v-else-if="!summary && (loading || !ready)" class="py-10 text-center text-sm text-muted">
      Loading...
    </p>

    <EmptyState
      v-else-if="summary && !summary.count"
      :icon="TrendingUp"
      title="No incomes match these filters"
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

      <!-- Fuente / subcategoria / tags: parte de un todo -> dona -->
      <BaseCard
        v-if="view === 'source' || view === 'subcategory' || view === 'tags'"
        :title="
          view === 'source'
            ? 'Income by source'
            : view === 'subcategory'
              ? `Income by subcategory · ${selectedSourceName}`
              : 'Income by tag'
        "
      >
        <template v-if="view === 'tags' && tagOverlap" #actions>
          <span class="text-xs text-amber-600 dark:text-amber-400">
            Some incomes have several tags: slices add up to more than the total.
          </span>
        </template>
        <DonutChart :items="catalogItems" :format="formatCOP" center-label="Total income" />
        <p v-if="view === 'tags' && untaggedShare" class="mt-4 text-xs text-muted">
          {{ untaggedShare }} of your income has no tag.
        </p>
        <p v-if="hiddenNegative.length" class="mt-2 text-xs text-muted">
          Not shown (net loss or zero):
          {{ hiddenNegative.map((i) => `${i.label} ${formatCOP(i.value)}`).join(', ') }}.
        </p>
      </BaseCard>

      <!-- Año / mes: serie de tiempo apilada por fuente (o subcategoria con una sola fuente) -->
      <template v-else>
        <BaseCard
          :title="view === 'month' ? `Income by month · ${selectedYear}` : 'Income by year'"
        >
          <template #actions>
            <span class="text-xs text-muted">
              Stacked by {{ stackNoun }}{{ view === 'year' ? ' · change vs previous year' : '' }}
            </span>
          </template>
          <StackedColumnChart
            :items="periodItems"
            :format="formatCOP"
            :axis-format="formatCompactCOP"
            :highlight-key="view === 'month' ? currentMonthKey : undefined"
            :show-average="view === 'month'"
            :show-delta="view === 'year'"
          />
        </BaseCard>

        <!-- Desglose del periodo: leyenda con total, % y promedio por periodo -->
        <BaseCard :title="`Breakdown by ${stackNoun}`">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="text-xs text-muted">
                <th class="pb-2 font-medium">
                  {{ stackNoun === 'source' ? 'Source' : 'Subcategory' }}
                </th>
                <th class="pb-2 text-right font-medium">Total</th>
                <th class="pb-2 text-right font-medium">Share</th>
                <th class="hidden pb-2 text-right font-medium sm:table-cell">
                  {{ view === 'month' ? 'Per month' : 'Per year' }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-subtle">
              <tr v-for="entry in legend" :key="entry.key">
                <td class="py-1.5">
                  <span class="flex items-center gap-2 text-foreground">
                    <span
                      class="h-2.5 w-2.5 shrink-0 rounded-full bg-current"
                      :class="entry.colorClass"
                    />
                    {{ entry.label }}
                  </span>
                </td>
                <td
                  class="py-1.5 text-right tabular-nums"
                  :class="entry.total < 0 ? 'text-ruby-text' : 'text-foreground'"
                >
                  {{ formatCOP(entry.total) }}
                </td>
                <td class="py-1.5 text-right text-muted">
                  {{ percentOf(entry.total, summary.total) }}
                </td>
                <td class="hidden py-1.5 text-right tabular-nums text-muted sm:table-cell">
                  {{
                    formatCOP(
                      entry.total /
                        Math.max(1, view === 'month' ? elapsedMonths : periodItems.length),
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </BaseCard>
      </template>

      <!-- Directo vs intereses: cuanto del ingreso trabaja solo -->
      <BaseCard v-if="showKindSplit" title="Direct vs interest">
        <ShareBar :items="kindItems" :format="formatCOP" />
      </BaseCard>
    </div>
  </div>
</template>
