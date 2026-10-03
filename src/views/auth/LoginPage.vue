<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import BaseButton from '@/components/ui/BaseButton.vue'
import { safeAdminPath } from '@/lib/redirect'
import { googleLoginUrl } from '@/services/authApi'

// El backend devuelve aca con ?error=<code> si el login no termina en sesion
// (ver ulm-core app/services/errors.py, LoginError.code). session_expired lo
// pone el front (router/authGuard.ts) cuando la API responde 401.
const ERROR_MESSAGES: Record<string, string> = {
  not_invited: "Your account doesn't have access yet. Ask the administrator for an invitation.",
  disabled: 'Your account has been disabled.',
  email_not_verified: 'Your Google account email is not verified.',
  cancelled: 'Sign in was cancelled.',
  not_configured: 'Sign in with Google is not configured on the server.',
  oauth_failed: 'Sign in with Google failed. Please try again.',
  session_expired: 'Your session has expired. Please sign in again.',
}

const route = useRoute()

const errorMessage = computed(() => {
  const code = route.query.error
  if (typeof code !== 'string') return null
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.oauth_failed
})

function signInWithGoogle() {
  // Vuelve a la pagina desde la que se llego al login (el guard la pone en
  // `redirect`), validada igual que en el backend.
  window.location.assign(googleLoginUrl(safeAdminPath(route.query.redirect) ?? undefined))
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-lg font-semibold text-foreground">Sign in</h1>
      <p class="text-sm text-muted">Welcome back.</p>
    </div>

    <p
      v-if="errorMessage"
      role="alert"
      class="rounded-lg border border-subtle bg-surface-hover px-3 py-2 text-sm text-foreground"
    >
      {{ errorMessage }}
    </p>

    <BaseButton type="button" class="w-full" @click="signInWithGoogle">
      Continue with Google
    </BaseButton>
  </div>
</template>
