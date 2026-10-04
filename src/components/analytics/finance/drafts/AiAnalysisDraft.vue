<script setup lang="ts">
import { CircleAlert, Info, SendHorizontal, Sparkles, TrendingUp } from '@lucide/vue'

import BaseCard from '@/components/ui/BaseCard.vue'

import DraftNotice from './DraftNotice.vue'
import { aiInsights } from './draftData'

const TONES = {
  warning: { icon: CircleAlert, classes: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  good: { icon: TrendingUp, classes: 'text-success-text bg-success/20' },
  info: { icon: Info, classes: 'text-accent-text bg-accent/10' },
}

const SUGGESTED_QUESTIONS = [
  'Where can I cut 10% of my spending?',
  'How long until I pay off the car loan?',
  'Am I on track for my savings goal?',
]
</script>

<template>
  <div class="space-y-4">
    <DraftNotice />

    <BaseCard title="Insights this month">
      <template #actions>
        <span class="flex items-center gap-1 text-xs text-muted">
          <Sparkles class="h-3.5 w-3.5" /> Generated Sep 26
        </span>
      </template>
      <ul class="grid gap-3 md:grid-cols-2">
        <li
          v-for="insight in aiInsights"
          :key="insight.title"
          class="flex gap-3 rounded-lg border border-subtle p-3"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            :class="TONES[insight.tone].classes"
          >
            <component :is="TONES[insight.tone].icon" class="h-4 w-4" />
          </span>
          <div>
            <p class="text-sm font-medium text-foreground">{{ insight.title }}</p>
            <p class="mt-0.5 text-xs text-muted">{{ insight.body }}</p>
          </div>
        </li>
      </ul>
    </BaseCard>

    <BaseCard title="Ask about your finances">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="question in SUGGESTED_QUESTIONS"
          :key="question"
          type="button"
          disabled
          class="cursor-not-allowed rounded-full border border-subtle px-3 py-1 text-xs text-muted"
        >
          {{ question }}
        </button>
      </div>
      <div
        class="mt-3 flex items-center gap-2 rounded-lg border border-subtle bg-background px-3 py-2"
      >
        <input
          disabled
          placeholder="Ask anything… (coming soon)"
          class="flex-1 cursor-not-allowed bg-transparent text-sm outline-none"
        />
        <SendHorizontal class="h-4 w-4 text-muted" />
      </div>
    </BaseCard>
  </div>
</template>
