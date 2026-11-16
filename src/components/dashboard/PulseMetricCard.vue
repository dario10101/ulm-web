<script setup lang="ts">
import { ArrowDownRight, ArrowRight, ArrowUpRight } from '@lucide/vue'
import { computed } from 'vue'

import BaseCard from '@/components/ui/BaseCard.vue'
import type { PulseComparison } from '@/types/dashboard'

/**
 * Una metrica del pulso: valor de la semana, cambio contra la anterior y
 * promedio de 4 semanas. `goodWhen` decide el color del cambio: subir el
 * gasto es malo, subir el puntaje es bueno, el peso es neutro.
 */
const props = defineProps<{
  title: string
  comparison: PulseComparison
  format: (value: number) => string
  goodWhen: 'up' | 'down' | 'neutral'
}>()

const delta = computed(() => {
  const { current, previous } = props.comparison
  if (current === null || previous === null) return null
  return current - previous
})

const trend = computed(() => {
  if (delta.value === null || Math.abs(delta.value) < 1e-9) return 'flat'
  return delta.value > 0 ? 'up' : 'down'
})

const trendClass = computed(() => {
  if (trend.value === 'flat' || props.goodWhen === 'neutral') return 'text-muted'
  return trend.value === props.goodWhen ? 'text-success-text' : 'text-ruby-text'
})

const trendIcon = computed(
  () => ({ up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight })[trend.value],
)

function show(value: number | null): string {
  return value === null ? '—' : props.format(value)
}
</script>

<template>
  <BaseCard :title="title">
    <p class="text-2xl font-semibold text-foreground" data-test="pulse-current">
      {{ show(comparison.current) }}
    </p>
    <p v-if="delta !== null" class="mt-1 flex items-center gap-1 text-sm" :class="trendClass">
      <component :is="trendIcon" class="h-4 w-4" />
      {{ delta > 0 ? '+' : delta < 0 ? '-' : '' }}{{ format(Math.abs(delta)) }} vs last week
    </p>
    <p v-else class="mt-1 text-sm text-muted">Last week: {{ show(comparison.previous) }}</p>
    <p class="mt-1 text-xs text-muted">4-week average: {{ show(comparison.average) }}</p>
    <slot />
  </BaseCard>
</template>
