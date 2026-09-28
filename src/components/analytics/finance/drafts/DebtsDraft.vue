<script setup lang="ts">
import BarList from '@/components/charts/BarList.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import LineChart from '@/components/ui/LineChart.vue'
import { formatCOP, formatCompactCOP } from '@/lib/currency'

import KpiTile from '../KpiTile.vue'
import DraftNotice from './DraftNotice.vue'
import { DRAFT_COLORS, DRAFT_MONTHS, debts, totalDebtByMonth } from './draftData'

const totalDebt = debts.reduce((sum, d) => sum + d.value, 0)
const paidDown = totalDebtByMonth[0] - totalDebtByMonth[totalDebtByMonth.length - 1]

const points = DRAFT_MONTHS.map((label) => ({ label }))
const series = [
  { id: 'debt', label: 'Total debt', color: DRAFT_COLORS.expenses, values: totalDebtByMonth },
]
</script>

<template>
  <div class="space-y-4">
    <DraftNotice />
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label="Total debt" :value="formatCOP(totalDebt)" />
      <KpiTile label="Paid down (YTD)" :value="formatCOP(paidDown)" />
      <KpiTile label="Monthly payments" value="$ 3.450.000" hint="27% of monthly income" />
      <KpiTile label="Most expensive" value="Credit card" hint="28.1% EA" />
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <BaseCard title="Balance by debt">
        <BarList :items="debts" :format="formatCOP" :share-of="totalDebt" />
      </BaseCard>
      <BaseCard title="Total debt over time">
        <LineChart :points="points" :series="series" :format="formatCompactCOP" />
      </BaseCard>
    </div>
  </div>
</template>
