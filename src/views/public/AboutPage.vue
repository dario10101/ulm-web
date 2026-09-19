<script setup lang="ts">
import BaseBadge from '@/components/ui/BaseBadge.vue'

const skills = [
  'Python',
  'SQL',
  'Apache Spark / PySpark',
  'AWS',
  'Arquitectura de software',
  'Desarrollo backend',
  'Vue / TypeScript',
]

const currentlyLearning = ['AWS Solutions Architect', 'Vue 3 + TypeScript', 'Diseño de sistemas']
</script>

<template>
  <div class="space-y-10">
    <div>
      <h1 class="text-2xl font-semibold text-foreground">Sobre mí</h1>
      <p class="mt-4 text-muted">
        Soy Data Engineer, tengo 28 años, trabajo full-time y dedico buena parte de mi tiempo libre
        a aprender cosas relacionadas con mi trabajo — y otras que no, como desarrollo frontend.
      </p>
      <p class="mt-4 text-muted">
        Fuera del código: gimnasio, kickboxing y lectura. Prefiero construir cosas chicas y útiles
        antes que terminar cosas grandes y pulidas — este sitio incluido.
      </p>
    </div>

    <div>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Habilidades</h2>
      <div class="flex flex-wrap gap-2">
        <BaseBadge v-for="skill in skills" :key="skill">{{ skill }}</BaseBadge>
      </div>
    </div>

    <div>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Aprendiendo actualmente</h2>
      <ul class="list-inside list-disc space-y-1 text-muted">
        <li v-for="item in currentlyLearning" :key="item">{{ item }}</li>
      </ul>
    </div>
  </div>
</template>
