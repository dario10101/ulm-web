<script setup lang="ts">
import { CalendarDays, ListChecks, Newspaper, Scale, Wallet } from '@lucide/vue'

// Borrador: descripcion de la app para quien entra a /blog sin un usuario.
// Texto quemado, igual que el resto del sitio por ahora.
const modules = [
  { label: 'Hábitos y checklists', icon: ListChecks },
  { label: 'Calendario', icon: CalendarDays },
  { label: 'Finanzas', icon: Wallet },
  { label: 'Peso y comidas', icon: Scale },
  { label: 'Blog personal', icon: Newspaper },
]
</script>

<template>
  <div class="space-y-12">
    <section>
      <p class="mb-3 text-sm font-medium text-ruby-text">Unified Life Manager</p>
      <h1 class="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
        Un solo lugar para organizar tu vida.
      </h1>
      <p class="mt-4 max-w-xl text-muted">
        ULM es una aplicación personal para llevar hábitos, planeación, finanzas y salud, con
        análisis sobre tus propios datos. Cada usuario puede además publicar su blog en
        <span class="font-medium text-foreground">/blog/&lt;usuario&gt;</span>.
      </p>
    </section>

    <section>
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Qué incluye</h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
          v-for="module in modules"
          :key="module.label"
          class="flex flex-col items-center gap-2 rounded-xl border border-subtle p-4 text-center text-sm text-muted"
        >
          <component :is="module.icon" class="h-5 w-5 text-accent-text" />
          {{ module.label }}
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-subtle p-5 text-sm text-muted">
      El acceso es por invitación.
      <RouterLink
        :to="{ name: 'admin-dashboard' }"
        class="font-medium text-accent-text hover:underline"
      >
        Entrar a la aplicación
      </RouterLink>
    </section>
  </div>
</template>
