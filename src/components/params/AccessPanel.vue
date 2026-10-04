<script setup lang="ts">
import { ExternalLink, UserPlus, Users } from '@lucide/vue'
import { onMounted, ref, shallowRef } from 'vue'

import BaseCard from '@/components/ui/BaseCard.vue'
import { ApiError } from '@/lib/http'
import { getAccessInfo } from '@/services/paramsApi'
import type { AccessInfo } from '@/types/params'

/**
 * Como entra alguien nuevo. Mientras la app OAuth de Google este en modo
 * Testing hacen falta dos pasos: invitarlo en ULM y agregarlo como test user
 * en Google Cloud (si falta el segundo, Google lo frena antes de llegar a ULM).
 */
const info = shallowRef<AccessInfo | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    info.value = await getAccessInfo()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not load the access settings.'
  }
})
</script>

<template>
  <div class="space-y-6">
    <p v-if="error" class="text-sm text-ruby-text">{{ error }}</p>

    <BaseCard title="Inviting someone">
      <p class="text-sm text-muted">
        Registration is
        <strong class="text-foreground">{{
          info?.registration_mode === 'open' ? 'open' : 'invite only'
        }}</strong
        >.
        <template v-if="info?.registration_mode !== 'open'">
          A new person needs both steps below, with the same Google email.
        </template>
      </p>

      <ol class="mt-4 space-y-4">
        <li class="flex gap-3">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent-text"
          >
            <Users class="h-3.5 w-3.5" />
          </span>
          <div class="min-w-0 text-sm">
            <p class="font-medium text-foreground">1. Invite them in ULM</p>
            <p class="text-muted">
              In
              <RouterLink
                :to="{ name: 'admin-settings', params: { section: 'users' } }"
                class="font-medium text-accent-text hover:underline"
                >Users</RouterLink
              >: invite the email, then choose the modules they can use. From a terminal,
              <code class="text-xs">python -m scripts.manage_users</code> does the same.
            </p>
          </div>
        </li>
        <li class="flex gap-3">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent-text"
          >
            <UserPlus class="h-3.5 w-3.5" />
          </span>
          <div class="min-w-0 text-sm">
            <p class="font-medium text-foreground">2. Add them as a Google test user</p>
            <p class="text-muted">
              While the Google app is in Testing mode, only listed test users can sign in (up to
              100).
            </p>
            <a
              v-if="info"
              :href="info.google_audience_url"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-accent-text/50"
            >
              Open Google Cloud test users
              <ExternalLink class="h-3.5 w-3.5 text-muted" />
            </a>
            <p
              v-if="info && !info.google_audience_url.includes('project=')"
              class="mt-1.5 text-xs text-muted"
            >
              Set GOOGLE_CLOUD_PROJECT in ulm-core's .env to open the right project directly.
            </p>
          </div>
        </li>
      </ol>
    </BaseCard>
  </div>
</template>
