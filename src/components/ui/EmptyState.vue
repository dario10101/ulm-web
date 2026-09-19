<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description?: string
}>()
</script>

<template>
  <div
    class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-subtle px-6 py-10 text-center"
  >
    <component :is="icon" class="h-6 w-6 text-muted" />
    <p class="text-sm font-medium text-foreground">{{ title }}</p>
    <p v-if="description" class="max-w-sm text-sm text-muted">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
