<script setup lang="ts">
import { LogIn, LogOut, Settings } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuth } from '@/composables/useAuth'

// Labels parametrizables porque este menu se usa tanto en /admin (ingles)
// como en el topbar de /blog (espanol).
withDefaults(
  defineProps<{
    accountLabel?: string
    logOutLabel?: string
    signInLabel?: string
  }>(),
  {
    accountLabel: 'Account settings',
    logOutLabel: 'Log out',
    signInLabel: 'Sign in',
  },
)

const router = useRouter()
const { user, status, ensureLoaded, logout } = useAuth()

// Si la foto de Google no carga (sin red, URL vencida) se cae a la inicial.
const avatarFailed = ref(false)
const initial = computed(() => user.value?.name.charAt(0).toUpperCase() ?? '')

onMounted(() => {
  // En /admin el guard ya lo cargo; en /blog (publico) se pregunta aca.
  // Un error de red no es asunto de este menu: se queda sin mostrarse.
  ensureLoaded().catch(() => {})
})

async function logOut() {
  // Si el backend falla igual se sale: el estado local ya quedo limpio y la
  // cookie que haya quedado viva en el servidor vence sola.
  await logout().catch(() => {})
  router.push({ name: 'auth-login' })
}
</script>

<template>
  <!-- <details> nativo: dropdown sin JS para abrir/cerrar -->
  <details v-if="user" class="relative">
    <summary
      class="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface-hover"
    >
      <!-- no-referrer: Google rechaza las fotos de perfil pedidas con Referer de otro sitio -->
      <img
        v-if="user.avatar_url && !avatarFailed"
        :src="user.avatar_url"
        alt=""
        referrerpolicy="no-referrer"
        class="h-7 w-7 rounded-full object-cover"
        @error="avatarFailed = true"
      />
      <span
        v-else
        class="flex h-7 w-7 items-center justify-center rounded-full bg-ruby text-xs font-semibold text-white"
      >
        {{ initial }}
      </span>
      <span class="hidden text-sm font-medium text-foreground sm:inline">
        {{ user.name }}
      </span>
    </summary>

    <div
      class="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-subtle bg-surface p-1 shadow-lg"
    >
      <p class="truncate px-3 py-2 text-xs text-muted" :title="user.email">{{ user.email }}</p>
      <RouterLink
        :to="{ name: 'admin-settings' }"
        class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
      >
        <Settings class="h-4 w-4" />
        {{ accountLabel }}
      </RouterLink>
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-surface-hover hover:text-foreground"
        @click="logOut"
      >
        <LogOut class="h-4 w-4" />
        {{ logOutLabel }}
      </button>
    </div>
  </details>

  <RouterLink
    v-else-if="status === 'anonymous'"
    :to="{ name: 'auth-login' }"
    class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
  >
    <LogIn class="h-4 w-4" />
    {{ signInLabel }}
  </RouterLink>
</template>
