<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'neutral' | 'accent' | 'ruby' }>(), { tone: 'neutral' })

const tones = {
  neutral: 'bg-surface-hover text-muted',
  accent: 'bg-accent/15 text-accent-text',
  ruby: 'bg-ruby/15 text-ruby-text',
}
</script>

<template>
  <span :class="['rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone]]">
    <slot />
  </span>
</template>
