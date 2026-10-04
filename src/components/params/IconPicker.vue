<script setup lang="ts">
import { Search } from '@lucide/vue'
import { computed, ref } from 'vue'

import { FINANCE_ICON_KEYS, financeColorClasses, financeIcon } from '@/config/financeVisuals'

/** Elige el "logo" (icono de lucide) de una categoria o metodo de pago, con
 * vista previa en el color elegido. */
const model = defineModel<string>({ required: true })
defineProps<{ colorKey: string }>()

const query = ref('')

const keys = computed(() => {
  const text = query.value.trim().toLowerCase()
  return text ? FINANCE_ICON_KEYS.filter((key) => key.includes(text)) : FINANCE_ICON_KEYS
})
</script>

<template>
  <div class="space-y-2">
    <label
      class="flex items-center gap-2 rounded-lg border border-subtle bg-background px-2 py-1.5 text-sm focus-within:border-accent-text/50"
    >
      <Search class="h-3.5 w-3.5 text-muted" />
      <input
        v-model="query"
        type="search"
        placeholder="Search icons"
        aria-label="Search icons"
        class="w-full bg-transparent outline-none"
      />
    </label>
    <div
      role="radiogroup"
      aria-label="Icon"
      class="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto pr-1"
    >
      <button
        v-for="key in keys"
        :key="key"
        type="button"
        role="radio"
        :aria-checked="model === key"
        :title="key"
        class="flex aspect-square items-center justify-center rounded-md border transition-colors"
        :class="
          model === key
            ? [financeColorClasses(colorKey).bg, financeColorClasses(colorKey).border]
            : 'border-transparent hover:bg-surface-hover'
        "
        @click="model = key"
      >
        <component
          :is="financeIcon(key)"
          class="h-4 w-4"
          :class="model === key ? financeColorClasses(colorKey).text : 'text-muted'"
        />
      </button>
      <p v-if="!keys.length" class="col-span-8 py-3 text-center text-xs text-muted">
        No icons match.
      </p>
    </div>
  </div>
</template>
