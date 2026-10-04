<script setup lang="ts">
import { computed, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useAuth } from '@/composables/useAuth'
import { ApiError } from '@/lib/http'
import { normalizeUsername, USERNAME_MAX, usernameFormatError } from '@/lib/username'
import { setUsername } from '@/services/authApi'

/**
 * Crear el username: una sola vez (el backend no lo deja cambiar, para no
 * romper links ni liberar el nombre). Es de la cuenta, no del blog: a futuro
 * sera tambien el usuario del login con contraseña.
 */
const { user, setUser } = useAuth()

const draft = ref('')
const saving = ref(false)
const serverError = ref<string | null>(null)

const normalized = computed(() => normalizeUsername(draft.value))
const previewPath = computed(() => `/blog/${normalized.value || '<username>'}`)
// Sin escribir nada no se muestra error: todavia no hay nada que corregir.
const formatError = computed(() => (draft.value ? usernameFormatError(draft.value) : null))
const canSave = computed(() => !!draft.value && !formatError.value && !saving.value)

async function save() {
  if (!canSave.value) return
  saving.value = true
  serverError.value = null
  try {
    setUser(await setUsername(normalized.value))
    draft.value = ''
  } catch (err) {
    serverError.value = err instanceof ApiError ? err.message : 'Could not save the username.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseCard title="Username">
    <template v-if="user?.username">
      <input
        type="text"
        :value="user.username"
        readonly
        aria-label="Username"
        class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm sm:max-w-xs"
      />
      <p class="mt-2 text-sm text-muted">
        Your blog lives at
        <RouterLink
          :to="{ name: 'blog-home', params: { username: user.username } }"
          class="font-medium text-accent-text hover:underline"
          >/blog/{{ user.username }}</RouterLink
        >. The username can't be changed.
      </p>
    </template>

    <form v-else class="space-y-2" novalidate @submit.prevent="save">
      <div class="flex flex-col gap-2 sm:flex-row">
        <input
          v-model="draft"
          type="text"
          aria-label="Username"
          placeholder="e.g. ruben-d"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          :maxlength="USERNAME_MAX"
          class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm sm:max-w-xs"
        />
        <BaseButton type="submit" :disabled="!canSave">
          {{ saving ? 'Saving…' : 'Create username' }}
        </BaseButton>
      </div>
      <p class="text-sm text-muted" data-test="username-hint">
        This username will be used as the URL of your blog:
        <span class="font-medium text-foreground">{{ previewPath }}</span
        >. It can't be changed later.
      </p>
      <p v-if="formatError" class="text-sm text-ruby-text">{{ formatError }}</p>
      <p v-if="serverError" class="text-sm text-ruby-text" role="alert">{{ serverError }}</p>
    </form>
  </BaseCard>
</template>
