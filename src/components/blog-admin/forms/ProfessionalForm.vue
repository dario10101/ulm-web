<script setup lang="ts">
import { nullIfBlank, useSectionContentForm } from '@/composables/useSectionContentForm'
import type { ProfessionalContent } from '@/types/blog'
import type { AdminSection } from '@/types/blogAdmin'

import FormFooter from '../FormFooter.vue'
import LinksField from '../LinksField.vue'
import MarkdownField from '../MarkdownField.vue'
import RepeatableList from '../RepeatableList.vue'
import { INPUT, LABEL } from '../styles'
import TagsField from '../TagsField.vue'

// Perfil profesional. Fechas como "2024" o "2024-03" (sin fin = actual).
// Topes = ProfessionalContent en ulm-core.
const props = defineProps<{ section: AdminSection }>()
const emit = defineEmits<{ saved: [section: AdminSection] }>()

const { draft, dirty, saving, error, saved, save } = useSectionContentForm<ProfessionalContent>(
  () => props.section,
  {
    toPayload: (content) => ({
      ...content,
      experience: content.experience.map((job) => ({ ...job, end: nullIfBlank(job.end) })),
      education: content.education.map((study) => ({
        ...study,
        start: nullIfBlank(study.start),
        end: nullIfBlank(study.end),
      })),
      certifications: content.certifications.map((cert) => ({
        ...cert,
        url: nullIfBlank(cert.url),
        // input type=number deja "" si se borra.
        year: typeof cert.year === 'number' ? cert.year : null,
      })),
    }),
    onSaved: (section) => emit('saved', section),
  },
)

const DATE_HINT = 'YYYY or YYYY-MM'

// Tipadas aca: escritas en el template, el generico de RepeatableList se
// deduciria del literal (end: null) y no del tipo de la lista.
type Content = ProfessionalContent
const newJob = (): Content['experience'][number] => ({
  company: '',
  role: '',
  start: '',
  end: null,
  description: '',
})
const newStudy = (): Content['education'][number] => ({
  institution: '',
  degree: '',
  start: null,
  end: null,
  description: '',
})
const newCertification = (): Content['certifications'][number] => ({
  name: '',
  issuer: '',
  year: null,
  url: null,
})
</script>

<template>
  <form class="space-y-6" @submit.prevent="save">
    <label class="block">
      <span :class="LABEL">Headline</span>
      <input v-model="draft.headline" :class="INPUT" maxlength="120" aria-label="Headline" />
    </label>
    <MarkdownField v-model="draft.summary" label="Summary" :rows="6" :maxlength="10000" />

    <RepeatableList
      v-model="draft.experience"
      label="Experience"
      noun="position"
      :max="30"
      :create="newJob"
    >
      <template #default="{ row }">
        <div class="grid gap-2 sm:grid-cols-2">
          <input
            v-model="row.role"
            :class="INPUT"
            placeholder="Role"
            aria-label="Role"
            maxlength="120"
          />
          <input
            v-model="row.company"
            :class="INPUT"
            placeholder="Company"
            aria-label="Company"
            maxlength="120"
          />
          <input
            v-model="row.start"
            :class="INPUT"
            :placeholder="`Start (${DATE_HINT})`"
            aria-label="Start"
          />
          <input
            v-model="row.end"
            :class="INPUT"
            :placeholder="`End (${DATE_HINT}, empty = current)`"
            aria-label="End"
          />
        </div>
        <textarea
          v-model="row.description"
          :class="INPUT"
          rows="2"
          placeholder="Description (markdown)"
          aria-label="Description"
          maxlength="2000"
        />
      </template>
    </RepeatableList>

    <RepeatableList
      v-model="draft.education"
      label="Education"
      noun="study"
      :max="20"
      :create="newStudy"
    >
      <template #default="{ row }">
        <div class="grid gap-2 sm:grid-cols-2">
          <input
            v-model="row.degree"
            :class="INPUT"
            placeholder="Degree"
            aria-label="Degree"
            maxlength="120"
          />
          <input
            v-model="row.institution"
            :class="INPUT"
            placeholder="Institution"
            aria-label="Institution"
            maxlength="120"
          />
          <input
            v-model="row.start"
            :class="INPUT"
            :placeholder="`Start (${DATE_HINT}, optional)`"
            aria-label="Study start"
          />
          <input
            v-model="row.end"
            :class="INPUT"
            :placeholder="`End (${DATE_HINT}, optional)`"
            aria-label="Study end"
          />
        </div>
      </template>
    </RepeatableList>

    <TagsField v-model="draft.skills" label="Skills" :max="50" />

    <RepeatableList
      v-model="draft.certifications"
      label="Certifications"
      noun="certification"
      :max="30"
      :create="newCertification"
    >
      <template #default="{ row }">
        <div class="grid gap-2 sm:grid-cols-[1fr_1fr_6rem]">
          <input
            v-model="row.name"
            :class="INPUT"
            placeholder="Name"
            aria-label="Certification name"
            maxlength="120"
          />
          <input
            v-model="row.issuer"
            :class="INPUT"
            placeholder="Issuer"
            aria-label="Issuer"
            maxlength="120"
          />
          <input
            v-model.number="row.year"
            :class="INPUT"
            type="number"
            placeholder="Year"
            aria-label="Year"
          />
        </div>
        <input
          v-model="row.url"
          :class="INPUT"
          type="url"
          placeholder="Credential URL (https, optional)"
          aria-label="Credential URL"
        />
      </template>
    </RepeatableList>

    <LinksField v-model="draft.links" />
    <FormFooter :dirty="dirty" :saving="saving" :error="error" :saved="saved" />
  </form>
</template>
