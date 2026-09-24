<script setup lang="ts">
import { LogOut, Settings } from '@lucide/vue'
import { useRouter } from 'vue-router'

// Labels parametrizables porque este menu se usa tanto en /admin (ingles)
// como en el topbar de /blog (espanol).
withDefaults(
  defineProps<{
    name?: string
    accountLabel?: string
    logOutLabel?: string
  }>(),
  {
    name: 'Ruben',
    accountLabel: 'Account settings',
    logOutLabel: 'Log out',
  },
)

const router = useRouter()

function logOut() {
  // Sin auth real: "cerrar sesion" solo simula la navegacion al login.
  router.push({ name: 'auth-login' })
}
</script>

<template>
  <!-- <details> nativo: dropdown sin JS para abrir/cerrar -->
  <details class="relative">
    <summary
      class="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface-hover"
    >
      <span
        class="flex h-7 w-7 items-center justify-center rounded-full bg-ruby text-xs font-semibold text-white"
      >
        {{ name.charAt(0) }}
      </span>
      <span class="hidden text-sm font-medium text-foreground sm:inline">
        {{ name }}
      </span>
    </summary>

    <div
      class="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-subtle bg-surface p-1 shadow-lg"
    >
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
</template>
