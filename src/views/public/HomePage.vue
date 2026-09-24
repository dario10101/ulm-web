<script setup lang="ts">
import { Code2, Dumbbell, LineChart, Swords } from '@lucide/vue'

import { posts } from '@/data/posts'

const interests = [
  { label: 'Ingeniería de datos', icon: LineChart },
  { label: 'Frontend y dev asistido por IA', icon: Code2 },
  { label: 'Kickboxing y gimnasio', icon: Swords },
  { label: 'Entrenamiento de fuerza', icon: Dumbbell },
]
</script>

<template>
  <div class="space-y-16">
    <section>
      <p class="mb-3 text-sm font-medium text-ruby-text">Hola, soy Ruben</p>
      <h1 class="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
        Data Engineer, siempre construyendo algo por mi cuenta.
      </h1>
      <p class="mt-4 max-w-xl text-muted">
        28 años, trabajo full-time como Data Engineer. Escribo sobre lo que voy aprendiendo — sobre
        todo datos, arquitectura de software, y lo que vaya construyendo para
        <RouterLink :to="{ name: 'public-projects' }" class="text-accent-text hover:underline"
          >Unified Life Manager</RouterLink
        >, un sistema personal que uso para aprender frontend y desarrollo asistido por IA.
      </p>
    </section>

    <section>
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">En qué ando</h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="interest in interests"
          :key="interest.label"
          class="flex flex-col items-center gap-2 rounded-xl border border-subtle p-4 text-center text-sm text-muted"
        >
          <component :is="interest.icon" class="h-5 w-5 text-accent-text" />
          {{ interest.label }}
        </div>
      </div>
    </section>

    <section>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">Últimos escritos</h2>
        <RouterLink
          :to="{ name: 'public-writing' }"
          class="text-sm text-accent-text hover:underline"
        >
          Ver todos
        </RouterLink>
      </div>
      <div class="space-y-5">
        <RouterLink
          v-for="post in posts.slice(0, 2)"
          :key="post.slug"
          :to="{ name: 'public-writing-post', params: { slug: post.slug } }"
          class="block"
        >
          <p class="text-xs text-muted">{{ post.date }}</p>
          <h3 class="font-medium text-foreground hover:text-accent-text">{{ post.title }}</h3>
          <p class="text-sm text-muted">{{ post.excerpt }}</p>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
