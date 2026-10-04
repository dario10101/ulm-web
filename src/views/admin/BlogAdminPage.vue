<script setup lang="ts">
import { AtSign, ExternalLink, Newspaper } from '@lucide/vue'

import EmptyState from '@/components/ui/EmptyState.vue'
import { useAuth } from '@/composables/useAuth'

// Borrador: el modulo todavia no tiene funciones (ver PLAN-BLOG.md). Solo
// exige el username, que es la URL del blog.
const { user } = useAuth()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Blog</h1>
      <p class="text-sm text-muted">Manage the sections and posts of your public blog.</p>
    </div>

    <EmptyState
      v-if="!user?.username"
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

    <template v-else>
      <RouterLink
        :to="{ name: 'blog-home', params: { username: user.username } }"
        target="_blank"
        class="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline"
      >
        /blog/{{ user.username }}
        <ExternalLink class="h-3.5 w-3.5" />
      </RouterLink>
      <EmptyState
        :icon="Newspaper"
        title="Nothing here yet"
        description="Uploading posts and turning sections on or off are coming next."
      />
    </template>
  </div>
</template>
