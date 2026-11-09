<script setup lang="ts">
import { Menu, Newspaper } from '@lucide/vue'
import { computed } from 'vue'

import UserMenu from '@/components/layout/UserMenu.vue'
import { useAuth } from '@/composables/useAuth'
import { useLayoutState } from '@/composables/useLayoutState'

const { toggleSidebar } = useLayoutState()
const { user } = useAuth()

// Con username, el blog propio; sin el, la landing publica.
const blogLink = computed(() =>
  user.value?.username
    ? { name: 'blog-home', params: { username: user.value.username } }
    : { name: 'public-home' },
)
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
      <!-- En mobile solo el icono (el texto queda para lectores de pantalla):
           con el texto completo no cabe junto a la marca y el avatar. -->
      <RouterLink
        :to="blogLink"
        class="-m-1.5 flex items-center gap-1.5 rounded-md p-1.5 text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground sm:m-0 sm:p-0 sm:hover:bg-transparent"
      >
        <Newspaper class="h-5 w-5 sm:h-4 sm:w-4" />
        <span class="sr-only sm:not-sr-only">Blog</span>
      </RouterLink>
      <UserMenu />
    </div>
  </header>
</template>
