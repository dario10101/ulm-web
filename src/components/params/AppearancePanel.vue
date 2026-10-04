<script setup lang="ts">
import { Check, Monitor, Moon, Sun } from '@lucide/vue'

import BaseCard from '@/components/ui/BaseCard.vue'
import { useTheme, type ThemePreference } from '@/composables/useTheme'

const { preference, resolved, setPreference } = useTheme()

const OPTIONS: { value: ThemePreference; label: string; hint: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', hint: "Follows this device's setting", icon: Monitor },
  { value: 'light', label: 'Light', hint: 'Always light', icon: Sun },
  { value: 'dark', label: 'Dark', hint: 'Always dark', icon: Moon },
]

// Miniatura de cada tema con sus colores reales (los mismos de style.css),
// fijos aca para que se vean bien aunque el tema actual sea el otro.
const PREVIEW = {
  light: { bg: '#F5F5F4', surface: '#FFFFFF', line: '#DEDEDB', text: '#1C1C1C' },
  dark: { bg: '#1A1A1A', surface: '#242424', line: '#333333', text: '#F0F0F0' },
}
</script>

<template>
  <BaseCard title="Theme">
    <p class="mb-4 text-sm text-muted">
      Saved on this device only, so your phone and your computer can differ.
    </p>
    <div role="radiogroup" aria-label="Theme" class="grid gap-3 sm:grid-cols-3">
      <button
        v-for="option in OPTIONS"
        :key="option.value"
        type="button"
        role="radio"
        :aria-checked="preference === option.value"
        class="group rounded-xl border p-2 text-left transition-colors"
        :class="
          preference === option.value
            ? 'border-accent-text bg-accent/10'
            : 'border-subtle hover:border-accent-text/50'
        "
        @click="setPreference(option.value)"
      >
        <!-- System muestra mitad clara y mitad oscura. -->
        <div class="flex h-20 overflow-hidden rounded-lg border border-subtle">
          <div
            v-for="side in option.value === 'system'
              ? (['light', 'dark'] as const)
              : [option.value]"
            :key="side"
            class="flex flex-1 gap-1.5 p-2"
            :style="{ background: PREVIEW[side].bg }"
          >
            <div class="w-1/4 rounded" :style="{ background: PREVIEW[side].surface }" />
            <div class="flex flex-1 flex-col gap-1.5">
              <div class="h-2 w-3/4 rounded-full" :style="{ background: PREVIEW[side].text }" />
              <div
                class="flex-1 rounded border"
                :style="{ background: PREVIEW[side].surface, borderColor: PREVIEW[side].line }"
              />
            </div>
          </div>
        </div>
        <div class="mt-2 flex items-center gap-2 px-1">
          <component :is="option.icon" class="h-4 w-4 text-muted" />
          <span class="flex-1">
            <span class="block text-sm font-medium text-foreground">{{ option.label }}</span>
            <span class="block text-xs text-muted">{{ option.hint }}</span>
          </span>
          <Check v-if="preference === option.value" class="h-4 w-4 text-accent-text" />
        </div>
      </button>
    </div>
    <p v-if="preference === 'system'" class="mt-3 text-xs text-muted">
      Your device is using the {{ resolved }} theme right now.
    </p>
  </BaseCard>
</template>
