<script setup lang="ts">
import AiCostMark from '@/components/ui/AiCostMark.vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'success'
    type?: 'button' | 'submit'
    /** La accion llama a una IA y gasta tokens: lleva la marca (AiCostMark). */
    aiCost?: boolean
  }>(),
  { variant: 'primary', type: 'button', aiCost: false },
)

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const variants = {
  primary: 'bg-cta text-white hover:bg-cta-hover',
  secondary: 'bg-surface text-foreground hover:bg-surface-hover',
  ghost: 'text-muted hover:bg-surface hover:text-foreground',
  success: 'bg-success text-white hover:bg-success/90',
}

// Ola de IA (style.css): blanca sobre los fondos de color, tinte de acento
// sobre los claros.
const shimmer = {
  primary: 'ai-shimmer ai-shimmer-on-fill',
  secondary: 'ai-shimmer',
  ghost: 'ai-shimmer',
  success: 'ai-shimmer ai-shimmer-on-fill',
}
</script>

<template>
  <button
    :type="type"
    :class="[base, variants[variant], aiCost && shimmer[variant]]"
    :title="aiCost ? 'Uses AI tokens' : undefined"
  >
    <AiCostMark v-if="aiCost" class="h-3.5 w-3.5" />
    <slot />
  </button>
</template>
