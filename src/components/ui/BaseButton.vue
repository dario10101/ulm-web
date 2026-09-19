<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', type: 'button' },
)

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const variants = {
  primary: 'bg-cta text-white hover:bg-cta-hover',
  secondary: 'bg-surface text-foreground hover:bg-surface-hover',
  ghost: 'text-muted hover:bg-surface hover:text-foreground',
}
</script>

<template>
  <button :type="type" :class="[base, variants[variant]]">
    <slot />
  </button>
</template>
