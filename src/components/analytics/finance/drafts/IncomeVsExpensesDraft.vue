<script setup lang="ts">
import ColumnChart from '@/components/charts/ColumnChart.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import LineChart from '@/components/ui/LineChart.vue'
import { formatCOP, formatCompactCOP } from '@/lib/currency'

import KpiTile from '../KpiTile.vue'
import DraftNotice from './DraftNotice.vue'
import { DRAFT_COLORS, DRAFT_MONTHS, expensesByMonth, incomeByMonth } from './draftData'

const totalIncome = incomeByMonth.reduce((sum, v) => sum + v, 0)
const totalExpenses = expensesByMonth.reduce((sum, v) => sum + v, 0)
const savingsRate = Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)

const points = DRAFT_MONTHS.map((label) => ({ label }))
const series = [
  { id: 'income', label: 'Income', color: DRAFT_COLORS.income, values: incomeByMonth },
  { id: 'expenses', label: 'Expenses', color: DRAFT_COLORS.expenses, values: expensesByMonth },
]

// Neto mensual (ingreso - gasto). ColumnChart aun no dibuja negativos: los
// datos de muestra no tienen meses en deficit.
const netItems = DRAFT_MONTHS.map((label, i) => {
  const value = incomeByMonth[i] - expensesByMonth[i]
  return { key: label, label, value, colorClass: 'text-success-text' }
})
</script>

<template>
  <div class="space-y-4">
    <DraftNotice />
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label="Income" :value="formatCOP(totalIncome)" hint="Jan – Sep 2026" />
      <KpiTile label="Expenses" :value="formatCOP(totalExpenses)" />
      <KpiTile label="Net saved" :value="formatCOP(totalIncome - totalExpenses)" />
      <KpiTile label="Savings rate" :value="`${savingsRate}%`" hint="Target: 25%" />
    </div>
    <BaseCard title="Income vs expenses">
      <LineChart :points="points" :series="series" :format="formatCompactCOP" />
    </BaseCard>
    <BaseCard title="Net saved per month">
      <ColumnChart
        :items="netItems"
        :format="formatCOP"
        :axis-format="formatCompactCOP"
        show-average
      />
    </BaseCard>
  </div>
</template>
