<script setup lang="ts">
import { Menu, Newspaper } from '@lucide/vue'

import UserMenu from '@/components/layout/UserMenu.vue'
import { useLayoutState } from '@/composables/useLayoutState'

const { toggleSidebar } = useLayoutState()
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-subtle bg-surface/80 px-4 backdrop-blur"
  >
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-md p-1.5 text-muted hover:bg-surface-hover lg:hidden"
        aria-label="Toggle navigation"
        @click="toggleSidebar"
      >
        <Menu class="h-5 w-5" />
      </button>
      <RouterLink :to="{ name: 'admin-dashboard' }" class="font-semibold text-foreground">
        Unified Life Manager
      </RouterLink>
    </div>

    <div class="flex items-center gap-4">
      <RouterLink
        :to="{ name: 'public-home' }"
        class="hidden items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground sm:flex"
      >
        <Newspaper class="h-4 w-4" />
        Blog
      </RouterLink>
      <UserMenu />
    </div>
  </header>
</template>
