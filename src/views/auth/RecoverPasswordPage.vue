<script setup lang="ts">
import { ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'

const sent = ref(false)
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-lg font-semibold text-foreground">Reset password</h1>
      <p class="text-sm text-muted">
        We'll send a reset link to your email.
      </p>
    </div>

    <form v-if="!sent" class="space-y-4" @submit.prevent="sent = true">
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Email</span>
        <input
          type="email"
          required
          class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
        />
      </label>
      <BaseButton type="submit" class="w-full">Send reset link</BaseButton>
    </form>
    <p v-else class="text-sm text-accent-text">Check your inbox — this is just a UI preview, no email was sent.</p>

    <RouterLink :to="{ name: 'auth-login' }" class="block text-center text-sm text-muted hover:text-accent-text">
      Back to sign in
    </RouterLink>
  </div>
</template>
