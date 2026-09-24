<script setup lang="ts">
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

const inProgress = [
  { topic: 'PySpark — window functions', progress: 60 },
  { topic: 'AWS — Solutions Architect prep', progress: 30 },
  { topic: 'Vue 3 + TypeScript', progress: 45 },
]

const toReview = ['SQL window functions', 'Python decorators', 'System design: caching']
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-foreground">Study & review</h1>
        <p class="text-sm text-muted">What you're learning and what's due for a refresh.</p>
      </div>
      <BaseButton>Start review session</BaseButton>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <BaseCard title="Continue learning">
        <ul class="space-y-4">
          <li v-for="item in inProgress" :key="item.topic">
            <div class="mb-1 flex justify-between text-sm">
              <span class="text-foreground">{{ item.topic }}</span>
              <span class="text-muted">{{ item.progress }}%</span>
            </div>
            <div class="h-1.5 rounded-full bg-surface-hover">
              <div
                class="h-1.5 rounded-full bg-accent-text"
                :style="{ width: `${item.progress}%` }"
              />
            </div>
          </li>
        </ul>
      </BaseCard>

      <BaseCard title="Due for review">
        <ul class="space-y-2">
          <li
            v-for="topic in toReview"
            :key="topic"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-foreground">{{ topic }}</span>
            <BaseBadge>Review</BaseBadge>
          </li>
        </ul>
      </BaseCard>
    </div>
  </div>
</template>
