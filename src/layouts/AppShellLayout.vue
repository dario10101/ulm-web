<script setup lang="ts">
import { onMounted } from 'vue'

import SidebarNav from '@/components/layout/SidebarNav.vue'
import TopBar from '@/components/layout/TopBar.vue'

onMounted(() => {
  document.documentElement.lang = 'en'
})
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <SidebarNav />

    <div class="flex min-w-0 flex-1 flex-col">
      <TopBar />
      <main class="flex-1 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
