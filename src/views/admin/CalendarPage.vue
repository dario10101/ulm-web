<script setup lang="ts">
import { computed } from 'vue'

import BaseCard from '@/components/ui/BaseCard.vue'
import { buildMonthGrid } from '@/lib/calendar'

const today = new Date()
const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
const grid = computed(() => buildMonthGrid(today))

// Dias de ejemplo con "eventos", solo para mostrar el punto de color.
const eventDays = new Set([3, 8, 15, 22, today.getDate()])
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Calendar</h1>
      <p class="text-sm text-muted">{{ monthLabel }}</p>
    </div>

    <BaseCard>
      <div class="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        <span v-for="day in weekdays" :key="day" class="py-1">{{ day }}</span>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="(cell, index) in grid"
          :key="index"
          class="flex aspect-square flex-col items-center justify-center rounded-lg text-sm"
          :class="[
            cell === today.getDate() ? 'bg-accent text-white' : 'text-foreground',
            cell === null ? 'invisible' : '',
          ]"
        >
          {{ cell }}
          <span
            v-if="cell !== null && eventDays.has(cell)"
            class="mt-0.5 h-1 w-1 rounded-full"
            :class="cell === today.getDate() ? 'bg-white' : 'bg-accent-text'"
          />
        </div>
      </div>
    </BaseCard>
  </div>
</template>
