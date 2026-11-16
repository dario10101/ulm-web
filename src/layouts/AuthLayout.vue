<script setup lang="ts">
import { onMounted } from 'vue'

import AppLogo from '@/components/layout/AppLogo.vue'

onMounted(() => {
  document.documentElement.lang = 'en'
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-background px-4">
    <RouterLink :to="{ name: 'public-home' }" class="mb-8">
      <AppLogo tagline />
    </RouterLink>
    <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-6">
      <RouterView />
    </div>
  </div>
</template>
