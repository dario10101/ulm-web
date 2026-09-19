<script setup lang="ts">
import { onMounted } from 'vue'

import UserMenu from '@/components/layout/UserMenu.vue'

// El sitio publico esta en espanol; el area privada (/admin) sigue en ingles.
onMounted(() => {
  document.documentElement.lang = 'es'
})

const navLinks = [
  { label: 'Inicio', to: { name: 'public-home' } },
  { label: 'Sobre mí', to: { name: 'public-about' } },
  { label: 'Proyectos', to: { name: 'public-projects' } },
  { label: 'Escritos', to: { name: 'public-writing' } },
]
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <header class="border-b border-subtle">
      <div class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-y-3 px-6 py-5">
        <RouterLink :to="{ name: 'public-home' }" class="font-semibold text-foreground">
          Ruben D.
        </RouterLink>

        <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
          <nav class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted">
            <RouterLink
              v-for="link in navLinks"
              :key="link.label"
              :to="link.to"
              class="hover:text-foreground"
              active-class="text-foreground"
            >
              {{ link.label }}
            </RouterLink>
          </nav>

          <div class="flex items-center gap-3 sm:border-l sm:border-subtle sm:pl-5">
            <RouterLink
              :to="{ name: 'admin-dashboard' }"
              class="rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
            >
              Admin
            </RouterLink>
            <UserMenu account-label="Ajustes de la cuenta" log-out-label="Cerrar sesión" />
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <RouterView />
    </main>

    <footer class="border-t border-subtle py-6 text-center text-sm text-muted">
      <RouterLink :to="{ name: 'admin-dashboard' }" class="hover:text-foreground">
        Admin
      </RouterLink>
    </footer>
  </div>
</template>
