<script setup lang="ts">
defineProps<{ label: string; value: string; hint?: string }>()
</script>

<template>
  <div class="rounded-xl border border-subtle bg-surface px-4 py-3">
    <p class="text-xs text-muted">{{ label }}</p>
    <p class="mt-0.5 truncate text-lg font-semibold text-foreground" :title="value">{{ value }}</p>
    <p v-if="hint" class="truncate text-xs text-muted" :title="hint">{{ hint }}</p>
  </div>
</template>
