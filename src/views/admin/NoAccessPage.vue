<script setup lang="ts">
import { Lock } from '@lucide/vue'

import EmptyState from '@/components/ui/EmptyState.vue'
</script>

<template>
  <!-- Llega aca el guard (router/authGuard.ts) si la ruta pide un permiso que
       el usuario no tiene: por un link directo o un modulo que se le quito. -->
  <EmptyState
    :icon="Lock"
    title="You don't have access to this module"
    description="Ask the administrator to grant it to your account."
  />
</template>
