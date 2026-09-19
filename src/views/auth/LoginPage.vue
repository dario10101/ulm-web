<script setup lang="ts">
import { useRouter } from 'vue-router'

import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()

function handleSubmit() {
  // Sin backend de auth todavia: el submit solo simula el flujo de login.
  router.push({ name: 'admin-dashboard' })
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-lg font-semibold text-foreground">Sign in</h1>
      <p class="text-sm text-muted">Welcome back.</p>
    </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Email</span>
        <input
          type="email"
          required
          class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
        />
      </label>
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Password</span>
        <input
          type="password"
          required
          class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
        />
      </label>
      <BaseButton type="submit" class="w-full">Sign in</BaseButton>
    </form>

    <RouterLink :to="{ name: 'auth-recover' }" class="block text-center text-sm text-muted hover:text-accent-text">
      Forgot your password?
    </RouterLink>
  </div>
</template>
