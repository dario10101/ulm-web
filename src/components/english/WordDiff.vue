<script setup lang="ts">
import type { EnglishDiffOp } from '@/types/english'

/**
 * Diff por palabras contra el texto esperado (lo calcula el backend, sin LLM):
 * lo que falto o cambio, tachado en rojo, y lo que dijo/escribio en su lugar.
 * Lo usan la lectura del speaking y el dictado del writing.
 */
defineProps<{ ops: EnglishDiffOp[] }>()
</script>

<template>
  <p class="text-sm leading-relaxed" lang="en" data-test="diff">
    <template v-for="(op, index) in ops" :key="index">
      <span v-if="op.kind === 'equal'" class="text-foreground">{{ op.expected.join(' ') }} </span>
      <template v-else>
        <span
          v-if="op.expected.length"
          class="text-rose-600 line-through dark:text-rose-400"
          data-test="diff-expected"
          >{{ op.expected.join(' ') }}</span
        >
        <span v-if="op.said.length" class="italic text-muted" data-test="diff-said">
          {{ op.kind === 'extra' ? '+' : '→' }} {{ op.said.join(' ') }}</span
        >
        {{ ' ' }}
      </template>
    </template>
  </p>
</template>
