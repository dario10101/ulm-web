<script setup lang="ts">
import { computed } from 'vue'

import BlogLinks from '@/components/blog/BlogLinks.vue'
import MarkdownContent from '@/components/blog/MarkdownContent.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import type { ProfessionalContent, PublicSection } from '@/types/blog'

// Perfil profesional: resumen, experiencia, estudios, skills y certificaciones.
const props = defineProps<{ section: PublicSection }>()

const content = computed(() => props.section.content as unknown as ProfessionalContent)

/** "2022-03" -> "mar. 2022"; "2024" se queda igual. Sin fin: "Actual". */
function period(start: string | null, end: string | null): string {
  const format = (value: string) => {
    const [year, month] = value.split('-')
    if (!month) return year
    return new Date(Number(year), Number(month) - 1).toLocaleDateString('es', {
      month: 'short',
      year: 'numeric',
    })
  }
  if (!start) return end ? format(end) : ''
  return `${format(start)} – ${end ? format(end) : 'Actual'}`
}
</script>

<template>
  <div class="space-y-10">
    <div>
      <h1 class="text-2xl font-semibold text-foreground">{{ section.label }}</h1>
      <p v-if="content.headline" class="mt-2 text-lg text-muted">{{ content.headline }}</p>
      <MarkdownContent v-if="content.summary" :source="content.summary" class="mt-4 text-muted" />
    </div>

    <section v-if="content.experience.length">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Experiencia</h2>
      <ol class="space-y-6 border-l border-subtle pl-5">
        <li v-for="job in content.experience" :key="`${job.company}-${job.start}`">
          <p class="text-xs text-muted">{{ period(job.start, job.end) }}</p>
          <h3 class="font-medium text-foreground">{{ job.role }} · {{ job.company }}</h3>
          <MarkdownContent
            v-if="job.description"
            :source="job.description"
            class="mt-1 text-sm text-muted"
          />
        </li>
      </ol>
    </section>

    <section v-if="content.education.length">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Estudios</h2>
      <ul class="space-y-4">
        <li v-for="study in content.education" :key="`${study.institution}-${study.degree}`">
          <h3 class="font-medium text-foreground">{{ study.degree }}</h3>
          <p class="text-sm text-muted">
            {{ study.institution }}
            <template v-if="study.start || study.end">
              · {{ period(study.start, study.end) }}</template
            >
          </p>
          <p v-if="study.description" class="mt-1 text-sm text-muted">{{ study.description }}</p>
        </li>
      </ul>
    </section>

    <section v-if="content.skills.length">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Habilidades</h2>
      <div class="flex flex-wrap gap-2">
        <BaseBadge v-for="skill in content.skills" :key="skill" tone="accent">{{
          skill
        }}</BaseBadge>
      </div>
    </section>

    <section v-if="content.certifications.length">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Certificaciones</h2>
      <ul class="space-y-2 text-sm">
        <li v-for="cert in content.certifications" :key="cert.name">
          <a
            v-if="cert.url"
            :href="cert.url"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="font-medium text-accent-text hover:underline"
            >{{ cert.name }}</a
          >
          <span v-else class="font-medium text-foreground">{{ cert.name }}</span>
          <span v-if="cert.issuer || cert.year" class="text-muted">
            · {{ [cert.issuer, cert.year].filter(Boolean).join(', ') }}
          </span>
        </li>
      </ul>
    </section>

    <BlogLinks :links="content.links" />
  </div>
</template>
