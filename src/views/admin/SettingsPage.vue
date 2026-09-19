<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'

const toggles = [
  { label: 'Daily checklist reminder', enabled: true },
  { label: 'Weekly analytics summary email', enabled: false },
  { label: 'Habit streak alerts', enabled: true },
]
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Settings</h1>
      <p class="text-sm text-muted">
        Controls here are visual only for now — nothing is persisted.
      </p>
    </div>

    <BaseCard title="Profile">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="text-sm">
          <span class="mb-1 block text-muted">Display name</span>
          <input
            type="text"
            value="Ruben"
            class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block text-muted">Email</span>
          <input
            type="email"
            value="ruben@example.com"
            class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          />
        </label>
      </div>
    </BaseCard>

    <BaseCard title="Appearance">
      <p class="text-sm text-muted">
        Follows your system's light/dark preference. A manual switch can be added later.
      </p>
    </BaseCard>

    <BaseCard title="Notifications">
      <ul class="divide-y divide-subtle">
        <li v-for="toggle in toggles" :key="toggle.label" class="flex items-center justify-between py-2">
          <span class="text-sm text-foreground">{{ toggle.label }}</span>
          <input type="checkbox" :checked="toggle.enabled" class="h-4 w-4 rounded border-subtle accent-cta" />
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
