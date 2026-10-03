<script setup lang="ts">
import { Tag } from '@lucide/vue'

import { financeColorClasses } from '@/config/financeVisuals'
import type { ExpenseTagOption } from '@/types/expense'

// Celda de tags de las tablas de finanzas: contador desplegable en vez de
// badges inline, que con varios tags rompian el ancho de la columna.
defineProps<{ tags: ExpenseTagOption[] }>()
</script>

<template>
  <span v-if="!tags.length" class="text-muted">—</span>
  <details v-else class="relative">
    <summary
      class="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md border border-subtle px-1.5 py-0.5 text-xs text-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
    >
      <Tag class="h-3 w-3" />
      {{ tags.length }}
    </summary>
    <div
      class="absolute z-10 mt-1 flex w-max max-w-48 flex-col gap-1 rounded-lg border border-subtle bg-surface p-2 shadow-lg"
    >
      <span
        v-for="tag in tags"
        :key="tag.id"
        class="rounded-full border px-2 py-0.5 text-xs font-medium"
        :class="[
          financeColorClasses(tag.color_key).bg,
          financeColorClasses(tag.color_key).text,
          financeColorClasses(tag.color_key).border,
        ]"
      >
        {{ tag.name }}
      </span>
    </div>
  </details>
</template>
