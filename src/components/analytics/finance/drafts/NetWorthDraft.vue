<script setup lang="ts">
import ShareBar from '@/components/charts/ShareBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import LineChart from '@/components/ui/LineChart.vue'
import { formatCOP, formatCompactCOP } from '@/lib/currency'

import KpiTile from '../KpiTile.vue'
import DraftNotice from './DraftNotice.vue'
import {
  DRAFT_COLORS,
  DRAFT_MONTHS,
  assetBreakdown,
  assetsByMonth,
  totalDebtByMonth,
} from './draftData'

const netWorthByMonth = assetsByMonth.map((assets, i) => assets - totalDebtByMonth[i])
const last = netWorthByMonth.length - 1
const change = netWorthByMonth[last] - netWorthByMonth[0]

const points = DRAFT_MONTHS.map((label) => ({ label }))
const series = [
  { id: 'assets', label: 'Assets', color: DRAFT_COLORS.income, values: assetsByMonth },
  {
    id: 'liabilities',
    label: 'Liabilities',
    color: DRAFT_COLORS.expenses,
    values: totalDebtByMonth,
  },
  { id: 'net', label: 'Net worth', color: DRAFT_COLORS.amber, values: netWorthByMonth },
]
</script>

<template>
  <div class="space-y-4">
    <DraftNotice />
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label="Net worth" :value="formatCOP(netWorthByMonth[last])" />
      <KpiTile label="Change (YTD)" :value="formatCOP(change)" hint="+ 23% since January" />
      <KpiTile label="Assets" :value="formatCOP(assetsByMonth[last])" />
      <KpiTile label="Liabilities" :value="formatCOP(totalDebtByMonth[last])" />
    </div>
    <BaseCard title="Assets, liabilities and net worth">
      <LineChart :points="points" :series="series" :format="formatCompactCOP" />
    </BaseCard>
    <BaseCard title="What your assets are made of">
      <ShareBar :items="assetBreakdown" :format="formatCompactCOP" />
    </BaseCard>
  </div>
</template>
