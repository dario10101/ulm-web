<script setup lang="ts">
import { Check } from '@lucide/vue'

import { FINANCE_COLOR_KEYS, financeColorClasses } from '@/config/financeVisuals'

/** Elige una llave de la paleta fija (ver config/financeVisuals.ts). */
const model = defineModel<string>({ required: true })
</script>

<template>
  <div role="radiogroup" aria-label="Color" class="flex flex-wrap gap-1.5">
    <button
      v-for="key in FINANCE_COLOR_KEYS"
      :key="key"
      type="button"
      role="radio"
      :aria-checked="model === key"
      :title="key"
      class="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform hover:scale-110"
      :class="[
        financeColorClasses(key).bg,
        model === key ? 'border-current' : 'border-transparent',
        financeColorClasses(key).text,
      ]"
      @click="model = key"
    >
      <span v-if="model !== key" class="h-3 w-3 rounded-full bg-current" />
      <Check v-else class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
