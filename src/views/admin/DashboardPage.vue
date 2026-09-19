<script setup lang="ts">
import { Activity, CheckCircle2, Circle, PiggyBank, Target } from '@lucide/vue'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

const todayTasks = [
  { label: 'Gym — push day', done: true },
  { label: 'Finish PySpark chapter 4', done: false },
  { label: 'Log today\'s expenses', done: false },
  { label: 'Kickboxing 7pm', done: false },
]

const habits = [
  { label: 'Read 20 min', streak: 6 },
  { label: 'No sugar', streak: 3 },
  { label: 'Sleep before midnight', streak: 1 },
]

const goals = [
  { label: 'Deadlift 140kg', progress: 70 },
  { label: 'Finish AWS certification', progress: 35 },
  { label: 'Save 20% of income', progress: 55 },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Good to see you back</h1>
      <p class="text-sm text-muted">Here's what matters today.</p>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <BaseCard title="Today">
        <ul class="space-y-2">
          <li v-for="task in todayTasks" :key="task.label" class="flex items-center gap-2 text-sm">
            <CheckCircle2 v-if="task.done" class="h-4 w-4 shrink-0 text-accent-text" />
            <Circle v-else class="h-4 w-4 shrink-0 text-muted" />
            <span :class="task.done ? 'text-muted line-through' : 'text-foreground'">
              {{ task.label }}
            </span>
          </li>
        </ul>
      </BaseCard>

      <BaseCard title="Habit streaks">
        <ul class="space-y-2">
          <li v-for="habit in habits" :key="habit.label" class="flex items-center justify-between text-sm">
            <span class="text-foreground">{{ habit.label }}</span>
            <BaseBadge tone="accent">{{ habit.streak }}d</BaseBadge>
          </li>
        </ul>
      </BaseCard>

      <BaseCard title="Active goals">
        <ul class="space-y-3">
          <li v-for="goal in goals" :key="goal.label">
            <div class="mb-1 flex justify-between text-sm">
              <span class="text-foreground">{{ goal.label }}</span>
              <span class="text-muted">{{ goal.progress }}%</span>
            </div>
            <div class="h-1.5 rounded-full bg-surface-hover">
              <div class="h-1.5 rounded-full bg-accent-text" :style="{ width: `${goal.progress}%` }" />
            </div>
          </li>
        </ul>
      </BaseCard>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <BaseCard>
        <div class="flex items-center gap-3">
          <PiggyBank class="h-5 w-5 text-accent-text" />
          <div>
            <p class="text-xs text-muted">Spent this month</p>
            <p class="text-lg font-semibold text-foreground">$842</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard>
        <div class="flex items-center gap-3">
          <Activity class="h-5 w-5 text-accent-text" />
          <div>
            <p class="text-xs text-muted">Workouts this week</p>
            <p class="text-lg font-semibold text-foreground">3</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard>
        <div class="flex items-center gap-3">
          <Target class="h-5 w-5 text-accent-text" />
          <div>
            <p class="text-xs text-muted">Study time this week</p>
            <p class="text-lg font-semibold text-foreground">4.5h</p>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
