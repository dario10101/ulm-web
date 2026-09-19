<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import MiniBarChart from '@/components/ui/MiniBarChart.vue'

const expenses = [
  { label: 'Apr', value: 620 },
  { label: 'May', value: 780 },
  { label: 'Jun', value: 540 },
  { label: 'Jul', value: 910 },
  { label: 'Aug', value: 842 },
]

const habitCompletion = [
  { label: 'Mon', value: 4 },
  { label: 'Tue', value: 3 },
  { label: 'Wed', value: 5 },
  { label: 'Thu', value: 2 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 3 },
]

const studyHours = [
  { label: 'W1', value: 3 },
  { label: 'W2', value: 5 },
  { label: 'W3', value: 2 },
  { label: 'W4', value: 4.5 },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Analytics</h1>
      <p class="text-sm text-muted">
        Sample data — this is a preview of how trends will look once records are real.
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <BaseCard title="Monthly expenses">
        <MiniBarChart :data="expenses" />
      </BaseCard>
      <BaseCard title="Habit completion this week">
        <MiniBarChart :data="habitCompletion" />
      </BaseCard>
      <BaseCard title="Study hours per week">
        <MiniBarChart :data="studyHours" />
      </BaseCard>
      <BaseCard title="Weight trend">
        <MiniBarChart :data="[
          { label: 'W1', value: 74.2 },
          { label: 'W2', value: 73.8 },
          { label: 'W3', value: 73.9 },
          { label: 'W4', value: 73.1 },
        ]" />
      </BaseCard>
    </div>
  </div>
</template>
