<script setup lang="ts">
import { ArrowLeftRight } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'

import DonutChart from '@/components/charts/DonutChart.vue'
import GroupedColumnChart, {
  type GroupedItem,
  type GroupedSeries,
} from '@/components/charts/GroupedColumnChart.vue'
import StackedColumnChart, { type StackedItem } from '@/components/charts/StackedColumnChart.vue'
import type { ChartItem } from '@/components/charts/types'
import BaseCard from '@/components/ui/BaseCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useExpenseOptions } from '@/composables/useExpenseOptions'
import { financeColorClasses } from '@/config/financeVisuals'
import { formatCOP, formatCompactCOP } from '@/lib/currency'
import { MONTH_SHORT_EN } from '@/lib/date'
import { ApiError } from '@/lib/http'
import {
  defaultIncomeVsExpensesFilters,
  filtersForView,
  incomeVsExpensesQuery,
  type IncomeVsExpensesFilters,
  type IncomeVsExpensesView,
} from '@/lib/incomeVsExpensesFilters'
import { summarizeExpenses } from '@/services/expensesApi'
import { summarizeIncomes } from '@/services/incomesApi'
import type { ExpenseSummary } from '@/types/expense'
import type { IncomeSummary } from '@/types/income'

import IncomeVsExpensesFilterBar from './IncomeVsExpensesFilterBar.vue'
import KpiTile from './KpiTile.vue'

// "Finance analysis -> Income vs expenses". No hay endpoint propio: se
// reutilizan los resumenes de cada area (mismos filtros, misma agrupacion)
// pedidos en paralelo, y el cruce (neto, tasa de ahorro) se calcula aca.
const props = defineProps<{ view: string }>()

const VIEWS: IncomeVsExpensesView[] = ['month', 'year', 'tags']
const view = computed<IncomeVsExpensesView>(() =>
  VIEWS.includes(props.view as IncomeVsExpensesView)
    ? (props.view as IncomeVsExpensesView)
    : 'month',
)
// Por tags solo importan los totales del tag elegido (va como filtro): la
// agrupacion da igual, se usa la de año por ser la mas barata.
const GROUP_BY = { month: 'month', year: 'year', tags: 'year' } as const

const INCOME_COLOR = 'text-emerald-600 dark:text-emerald-400'
const EXPENSE_COLOR = 'text-rose-600 dark:text-rose-400'
const SERIES: GroupedSeries[] = [
  { key: 'income', label: 'Income', colorClass: INCOME_COLOR },
  { key: 'expenses', label: 'Expenses', colorClass: EXPENSE_COLOR },
]

const { tags, ensureLoaded: ensureTagsLoaded } = useExpenseOptions()
onMounted(ensureTagsLoaded)

const filters = ref<IncomeVsExpensesFilters>(defaultIncomeVsExpensesFilters())
// Se reaplica cuando llegan los tags: la vista por tags necesita uno por defecto.
watch(
  [view, () => tags.value.length],
  () => {
    filters.value = filtersForView(filters.value, view.value, tags.value[0]?.id ?? null)
  },
  { immediate: true },
)

// Por tags sin tag elegido todavia (opciones cargando, o sin tags) no hay nada que pedir.
const ready = computed(() => view.value !== 'tags' || filters.value.tagId !== null)

const incomes = ref<IncomeSummary | null>(null)
const expenses = ref<ExpenseSummary | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let requestId = 0

async function fetchSummaries() {
  if (!ready.value) return
  // Si el usuario cambia filtros rapido, solo la ultima respuesta cuenta.
  const current = ++requestId
  loading.value = true
  error.value = null
  const query = incomeVsExpensesQuery(filters.value, view.value)
  const groupBy = GROUP_BY[view.value]
  try {
    const [incomeResult, expenseResult] = await Promise.all([
      summarizeIncomes(groupBy, query),
      summarizeExpenses(groupBy, query),
    ])
    if (current === requestId) {
      incomes.value = incomeResult
      expenses.value = expenseResult
    }
  } catch (err) {
    if (current === requestId) {
      error.value = err instanceof ApiError ? err.message : 'Could not load the analysis.'
    }
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch([view, filters], fetchSummaries, { immediate: true })

const hasData = computed(() => (incomes.value?.count ?? 0) + (expenses.value?.count ?? 0) > 0)

function savingsRate(income: number, net: number): number | null {
  return income > 0 ? Math.round((net / income) * 100) : null
}

function rateLabel(rate: number | null): string {
  return rate === null ? '—' : `${rate}%`
}

// --- Periodos (mes / año) ---

interface PeriodRow {
  key: string
  label: string
  title: string
  income: number
  expenses: number
  net: number
  rate: number | null
  /** Neto acumulado desde el primer periodo de la vista. */
  cumulative: number
}

function totalsByKey(buckets: { key: string; total: number }[] | undefined) {
  return new Map((buckets ?? []).map((b) => [b.key, b.total]))
}

const selectedYear = computed(() => filters.value.year ?? new Date().getFullYear())

const periodKeys = computed<{ key: string; label: string; title: string }[]>(() => {
  if (view.value === 'month') {
    return MONTH_SHORT_EN.map((name, index) => ({
      key: `${selectedYear.value}-${String(index + 1).padStart(2, '0')}`,
      label: name,
      title: `${name} ${selectedYear.value}`,
    }))
  }
  // Años: del primero al ultimo con datos en cualquiera de las dos areas, sin huecos.
  const years = [...(incomes.value?.buckets ?? []), ...(expenses.value?.buckets ?? [])].map((b) =>
    Number(b.key),
  )
  if (!years.length) return []
  const first = Math.min(...years)
  const last = Math.max(...years)
  return Array.from({ length: last - first + 1 }, (_, i) => {
    const key = String(first + i)
    return { key, label: key, title: key }
  })
})

const periods = computed<PeriodRow[]>(() => {
  const incomeByKey = totalsByKey(incomes.value?.buckets)
  const expenseByKey = totalsByKey(expenses.value?.buckets)
  let cumulative = 0
  return periodKeys.value.map(({ key, label, title }) => {
    const income = incomeByKey.get(key) ?? 0
    const spent = expenseByKey.get(key) ?? 0
    const net = income - spent
    cumulative += net
    return {
      key,
      label,
      title,
      income,
      expenses: spent,
      net,
      rate: savingsRate(income, net),
      cumulative,
    }
  })
})

const now = new Date()
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

// En el año en curso los meses futuros no cuentan (aun no pasaron): la tabla
// y los conteos de deficit los omiten, el grafico los deja vacios.
const elapsedPeriods = computed(() =>
  view.value === 'month' && selectedYear.value === now.getFullYear()
    ? periods.value.filter((p) => p.key <= currentMonthKey)
    : periods.value,
)

const groupedItems = computed<GroupedItem[]>(() =>
  periods.value.map((p) => ({
    key: p.key,
    label: p.label,
    meta: p.title,
    values: [p.income, p.expenses],
  })),
)

// Neto por periodo como columna "apilada" de un solo segmento: StackedColumnChart
// ya dibuja negativos bajo el cero, que es justo lo que hay que ver aca (deficit).
const netItems = computed<StackedItem[]>(() =>
  periods.value.map((p) => ({
    key: p.key,
    label: p.label,
    meta: p.title,
    segments: [
      {
        key: 'net',
        label: p.net >= 0 ? 'Saved' : 'Deficit',
        value: p.net,
        colorClass: p.net >= 0 ? INCOME_COLOR : EXPENSE_COLOR,
      },
    ],
  })),
)

const periodsByKey = computed(() => new Map(periods.value.map((p) => [p.key, p])))

// --- KPIs ---

const kpis = computed(() => {
  const totalIncome = incomes.value?.total ?? 0
  const totalExpenses = expenses.value?.total ?? 0
  const net = totalIncome - totalExpenses
  const rate = savingsRate(totalIncome, net)

  const result = [
    {
      label: 'Income',
      value: formatCOP(totalIncome),
      hint: `${incomes.value?.count ?? 0} incomes`,
    },
    {
      label: 'Expenses',
      value: formatCOP(totalExpenses),
      hint: `${expenses.value?.count ?? 0} expenses`,
    },
  ]

  if (view.value === 'tags') {
    return [
      ...result,
      { label: 'Net saved', value: formatCOP(net), hint: `Savings rate ${rateLabel(rate)}` },
      {
        label: 'Spent per $1 earned',
        value: totalIncome ? formatCOP(totalExpenses / totalIncome) : '—',
      },
    ]
  }

  const noun = view.value === 'month' ? 'month' : 'year'
  const deficits = elapsedPeriods.value.filter((p) => p.net < 0).length
  const best = [...elapsedPeriods.value]
    .filter((p) => p.rate !== null)
    .sort((a, b) => b.rate! - a.rate!)[0]
  return [
    ...result,
    {
      label: 'Net saved',
      value: formatCOP(net),
      hint: deficits
        ? `${deficits} ${noun}${deficits === 1 ? '' : 's'} in deficit`
        : `No ${noun}s in deficit`,
    },
    {
      label: 'Savings rate',
      value: rateLabel(rate),
      hint: best ? `Best ${noun}: ${best.title} (${rateLabel(best.rate)})` : undefined,
    },
  ]
})

// --- Por tags: un solo pastel, ingresos vs gastos del tag elegido ---

const selectedTag = computed(() => tags.value.find((t) => t.id === filters.value.tagId) ?? null)

const tagPieItems = computed<ChartItem[]>(() => [
  { key: 'income', label: 'Income', value: incomes.value?.total ?? 0, colorClass: INCOME_COLOR },
  {
    key: 'expenses',
    label: 'Expenses',
    value: expenses.value?.total ?? 0,
    colorClass: EXPENSE_COLOR,
  },
])

const tagNet = computed(() => (incomes.value?.total ?? 0) - (expenses.value?.total ?? 0))

const periodLabel = computed(() => {
  const { year, month } = filters.value
  if (!year) return 'All time'
  return month ? `${MONTH_SHORT_EN[month - 1]} ${year}` : String(year)
})
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-subtle bg-surface/40 p-2">
      <IncomeVsExpensesFilterBar v-model="filters" :view="view" />
    </div>

    <p v-if="error" class="py-6 text-center text-sm text-ruby-text">{{ error }}</p>
    <p v-else-if="!ready" class="py-10 text-center text-sm text-muted">
      Pick a tag to compare its income and expenses.
    </p>
    <p v-else-if="!incomes && loading" class="py-10 text-center text-sm text-muted">Loading...</p>

    <EmptyState
      v-else-if="incomes && !hasData"
      :icon="ArrowLeftRight"
      title="Nothing to compare yet"
      description="No incomes or expenses match these filters."
    />

    <div
      v-else-if="incomes"
      class="space-y-4 transition-opacity"
      :class="loading ? 'opacity-60' : ''"
    >
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile v-for="kpi in kpis" :key="kpi.label" v-bind="kpi" />
      </div>

      <!-- Mes / año: columnas lado a lado + neto (con deficit bajo el cero) + tabla -->
      <template v-if="view !== 'tags'">
        <BaseCard
          :title="
            view === 'month' ? `Income vs expenses · ${selectedYear}` : 'Income vs expenses by year'
          "
        >
          <GroupedColumnChart
            :series="SERIES"
            :items="groupedItems"
            :format="formatCOP"
            :axis-format="formatCompactCOP"
            :highlight-key="view === 'month' ? currentMonthKey : undefined"
          >
            <template #tooltip-footer="{ item }">
              <p
                class="mt-1 flex justify-between gap-3 border-t border-subtle pt-1 font-medium"
                :class="periodsByKey.get(item.key)!.net < 0 ? 'text-ruby-text' : 'text-foreground'"
              >
                <span>Net</span>
                <span>{{ formatCOP(periodsByKey.get(item.key)!.net) }}</span>
              </p>
              <p class="text-muted">
                Savings rate {{ rateLabel(periodsByKey.get(item.key)!.rate) }}
              </p>
            </template>
          </GroupedColumnChart>
        </BaseCard>

        <BaseCard :title="view === 'month' ? 'Net saved per month' : 'Net saved per year'">
          <template #actions>
            <span class="text-xs text-muted">Below zero = spent more than earned</span>
          </template>
          <StackedColumnChart
            :items="netItems"
            :format="formatCOP"
            :axis-format="formatCompactCOP"
            :highlight-key="view === 'month' ? currentMonthKey : undefined"
            :show-average="view === 'month'"
            :show-delta="view === 'year'"
          />
        </BaseCard>

        <BaseCard :title="view === 'month' ? 'Month by month' : 'Year by year'">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[32rem] text-left text-sm tabular-nums">
              <thead>
                <tr class="text-xs text-muted">
                  <th class="pb-2 font-medium">{{ view === 'month' ? 'Month' : 'Year' }}</th>
                  <th class="pb-2 text-right font-medium">Income</th>
                  <th class="pb-2 text-right font-medium">Expenses</th>
                  <th class="pb-2 text-right font-medium">Net</th>
                  <th class="pb-2 text-right font-medium">Savings rate</th>
                  <th class="pb-2 text-right font-medium">Accumulated</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-subtle">
                <tr v-for="row in elapsedPeriods" :key="row.key">
                  <td class="py-1.5 text-foreground">{{ row.title }}</td>
                  <td class="py-1.5 text-right text-foreground">{{ formatCOP(row.income) }}</td>
                  <td class="py-1.5 text-right text-foreground">{{ formatCOP(row.expenses) }}</td>
                  <td
                    class="py-1.5 text-right font-medium"
                    :class="row.net < 0 ? 'text-ruby-text' : 'text-success-text'"
                  >
                    {{ formatCOP(row.net) }}
                  </td>
                  <td class="py-1.5 text-right text-muted">{{ rateLabel(row.rate) }}</td>
                  <td
                    class="py-1.5 text-right"
                    :class="row.cumulative < 0 ? 'text-ruby-text' : 'text-muted'"
                  >
                    {{ formatCOP(row.cumulative) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>
      </template>

      <!-- Por tags: un solo pastel con ingresos y gastos del tag, comparados -->
      <BaseCard v-else :title="`${selectedTag?.name ?? 'Tag'} · ${periodLabel}`">
        <template v-if="selectedTag" #actions>
          <span
            class="h-2.5 w-2.5 rounded-full bg-current"
            :class="financeColorClasses(selectedTag.color_key).text"
          />
        </template>
        <DonutChart :items="tagPieItems" :format="formatCOP" center-label="Total moved" />
        <p class="mt-4 text-xs text-muted">
          <template v-if="(incomes?.total ?? 0) > 0">
            With this tag you
            <span :class="tagNet < 0 ? 'text-ruby-text' : 'text-success-text'">
              {{ tagNet < 0 ? 'spent' : 'kept' }} {{ formatCOP(Math.abs(tagNet)) }}
              {{ tagNet < 0 ? 'more than you earned' : 'of what you earned' }}</span
            >; expenses are {{ Math.round(((expenses?.total ?? 0) / incomes!.total) * 100) }}% of
            its income.
          </template>
          <template v-else>No income with this tag in the period, only expenses.</template>
        </p>
      </BaseCard>
    </div>
  </div>
</template>
