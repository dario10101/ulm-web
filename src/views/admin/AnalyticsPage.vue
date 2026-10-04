<script setup lang="ts">
import { computed } from 'vue'

import { useAuth } from '@/composables/useAuth'
import { analyticsTypes } from '@/config/analyticsTypes'

const { can } = useAuth()

// Solo los analisis de los modulos del usuario.
const visibleTypes = computed(() => analyticsTypes.filter((type) => can(type.permission)))
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Analytics</h1>
      <p class="text-sm text-muted">Pick what you want to analyze.</p>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <component
        :is="type.implemented ? 'RouterLink' : 'div'"
        v-for="type in visibleTypes"
        :key="type.id"
        :to="type.implemented ? type.to : undefined"
        :title="type.implemented ? undefined : 'Coming soon'"
        class="flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors"
        :class="
          type.implemented
            ? 'border-subtle text-muted hover:border-accent-text/50 hover:text-foreground'
            : 'pointer-events-none border-subtle text-muted opacity-40'
        "
      >
        <component :is="type.icon" class="h-5 w-5" />
        {{ type.label }}
      </component>
    </div>
  </div>
</template>
