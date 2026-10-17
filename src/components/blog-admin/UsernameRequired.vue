<script setup lang="ts">
import { AtSign } from '@lucide/vue'

import EmptyState from '@/components/ui/EmptyState.vue'

// El blog vive en /blog/<username>: sin username no tiene URL, asi que las
// pantallas de gestion lo piden primero.
</script>

<template>
  <EmptyState
    :icon="AtSign"
    title="Create your username first"
    description="Your blog needs a username: it's the URL where people will find it (/blog/<username>)."
  >
    <RouterLink
      :to="{ name: 'admin-settings', params: { section: 'general' } }"
      class="mt-2 rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta-hover"
    >
      Go to Settings
    </RouterLink>
  </EmptyState>
</template>
