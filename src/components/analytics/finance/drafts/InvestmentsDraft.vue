<script setup lang="ts">
import ColumnChart from '@/components/charts/ColumnChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import LineChart from '@/components/ui/LineChart.vue'
import { formatCOP, formatCompactCOP } from '@/lib/currency'

import KpiTile from '../KpiTile.vue'
import DraftNotice from './DraftNotice.vue'
import {
  DRAFT_COLORS,
  DRAFT_MONTHS,
  contributionsByMonth,
  investmentAllocation,
  portfolioValueByMonth,
} from './draftData'

const current = portfolioValueByMonth[portfolioValueByMonth.length - 1]
const contributed = contributionsByMonth.reduce((sum, v) => sum + v, 0)
const growth = current - portfolioValueByMonth[0] - contributed

const points = DRAFT_MONTHS.map((label) => ({ label }))
const series = [
  {
    id: 'value',
    label: 'Portfolio value',
    color: DRAFT_COLORS.accent,
    values: portfolioValueByMonth,
  },
]
const contributionItems = DRAFT_MONTHS.map((label, i) => ({
  key: label,
  label,
  value: contributionsByMonth[i],
}))
</script>

<template>
  <div class="space-y-4">
    <DraftNotice />
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label="Portfolio value" :value="formatCOP(current)" />
      <KpiTile label="Contributed (YTD)" :value="formatCOP(contributed)" />
      <KpiTile
        label="Market growth (YTD)"
        :value="formatCOP(growth)"
        hint="Excluding contributions"
      />
      <KpiTile label="Return (YTD)" value="+ 8.1%" />
    </div>
    <div class="grid gap-4 lg:grid-cols-5">
      <BaseCard title="Portfolio value" class="lg:col-span-3">
        <LineChart :points="points" :series="series" :format="formatCompactCOP" />
      </BaseCard>
      <BaseCard title="Allocation" class="lg:col-span-2">
        <DonutChart
          :items="investmentAllocation"
          :format="formatCompactCOP"
          center-label="Invested"
        />
      </BaseCard>
    </div>
    <BaseCard title="Monthly contributions">
      <ColumnChart
        :items="contributionItems"
        :format="formatCOP"
        :axis-format="formatCompactCOP"
        color-class="text-sky-600 dark:text-sky-400"
        show-average
      />
    </BaseCard>
  </div>
</template>
