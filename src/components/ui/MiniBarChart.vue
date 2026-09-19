<script setup lang="ts">
// Grafico de barras minimo, sin libreria externa: alcanza para
// representar "esto sera analytics" sin montar un pipeline de datos real.
const props = defineProps<{
  data: { label: string; value: number }[]
}>()

const max = Math.max(...props.data.map((d) => d.value), 1)
</script>

<template>
  <div class="flex h-32 gap-3">
    <div v-for="item in data" :key="item.label" class="flex h-full flex-1 flex-col items-center justify-end gap-2">
      <div
        class="w-full rounded-t bg-accent-text"
        :style="{ height: `${(item.value / max) * 100}%` }"
      />
      <span class="text-xs text-muted">{{ item.label }}</span>
    </div>
  </div>
</template>
