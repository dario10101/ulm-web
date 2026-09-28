<script setup lang="ts">
import ColumnChart from '@/components/charts/ColumnChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { formatCOP, formatCompactCOP } from '@/lib/currency'

import KpiTile from '../KpiTile.vue'
import DraftNotice from './DraftNotice.vue'
import { DRAFT_MONTHS, incomeByMonth, incomeBySource } from './draftData'

const total = incomeByMonth.reduce((sum, v) => sum + v, 0)
const monthItems = DRAFT_MONTHS.map((label, i) => ({
  key: label,
  label,
  value: incomeByMonth[i],
}))
</script>

<template>
  <div class="space-y-4">
    <DraftNotice />
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label="Total income" :value="formatCOP(total)" hint="Jan – Sep 2026" />
      <KpiTile label="Monthly average" :value="formatCOP(total / monthItems.length)" />
      <KpiTile label="Best month" value="Jun" hint="$ 9.800.000 · mid-year bonus" />
      <KpiTile label="Recurring share" value="86%" hint="Salary vs. everything else" />
    </div>
    <div class="grid gap-4 lg:grid-cols-5">
      <BaseCard title="Income by month" class="lg:col-span-3">
        <ColumnChart
          :items="monthItems"
          :format="formatCOP"
          :axis-format="formatCompactCOP"
          color-class="text-success-text"
          show-average
        />
      </BaseCard>
      <BaseCard title="Income by source" class="lg:col-span-2">
        <DonutChart :items="incomeBySource" :format="formatCompactCOP" center-label="Total" />
      </BaseCard>
    </div>
  </div>
</template>
