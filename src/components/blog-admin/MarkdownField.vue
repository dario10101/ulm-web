<script setup lang="ts">
import { ref } from 'vue'

import MarkdownContent from '@/components/blog/MarkdownContent.vue'

import { INPUT, LABEL } from './styles'

// Campo markdown de una plantilla (intro, bio, resumen...): textarea y
// vista previa con el mismo render del blog publico (MarkdownContent), asi
// lo que se ve aca es lo que vera el visitante.
const value = defineModel<string>({ required: true })

withDefaults(defineProps<{ label: string; rows?: number; maxlength?: number }>(), {
  rows: 5,
  maxlength: undefined,
})

const preview = ref(false)
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between">
      <span :class="LABEL" class="mb-0">{{ label }}</span>
      <div class="flex gap-1 text-xs" role="tablist" :aria-label="`${label} mode`">
        <button
          type="button"
          role="tab"
          :aria-selected="!preview"
          class="rounded px-2 py-0.5"
          :class="!preview ? 'bg-surface-hover text-foreground' : 'text-muted'"
          @click="preview = false"
        >
          Edit
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="preview"
          class="rounded px-2 py-0.5"
          :class="preview ? 'bg-surface-hover text-foreground' : 'text-muted'"
          @click="preview = true"
        >
          Preview
        </button>
      </div>
    </div>
    <div
      v-if="preview"
      class="min-h-[5rem] rounded-lg border border-subtle bg-background px-3 py-2 text-sm text-muted"
      data-test="markdown-preview"
    >
      <MarkdownContent v-if="value.trim()" :source="value" />
      <p v-else class="italic">Nothing to preview.</p>
    </div>
    <textarea
      v-else
      v-model="value"
      :rows="rows"
      :maxlength="maxlength"
      :aria-label="label"
      :class="INPUT"
      class="font-mono"
    />
    <p class="mt-1 text-xs text-muted">Markdown: **bold**, *italic*, [link](https://...), lists.</p>
  </div>
</template>
