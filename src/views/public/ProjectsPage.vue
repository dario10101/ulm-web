<script setup lang="ts">
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

const projects = [
  {
    name: 'Unified Life Manager',
    description:
      'Un sistema personal para llevar hábitos, finanzas, aprendizaje y salud, y un espacio para experimentar con frontend + desarrollo asistido por IA. Este sitio es parte de eso.',
    tags: ['Vue', 'TypeScript', 'FastAPI', 'En progreso'],
    link: null,
  },
  {
    name: 'Más próximamente',
    description:
      'Otros experimentos y proyectos personales van a aparecer acá a medida que tomen forma.',
    tags: ['Planeado'],
    link: null,
  },
]
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold text-foreground">Proyectos</h1>
      <p class="mt-2 text-muted">Cosas que construí o estoy construyendo.</p>
    </div>

    <BaseCard v-for="project in projects" :key="project.name" :title="project.name">
      <p class="text-sm text-muted">{{ project.description }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <BaseBadge v-for="tag in project.tags" :key="tag" tone="accent">{{ tag }}</BaseBadge>
      </div>
    </BaseCard>
  </div>
</template>
