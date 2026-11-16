<script setup lang="ts">
import { nullIfBlank, useSectionContentForm } from '@/composables/useSectionContentForm'
import type { HomeContent } from '@/types/blog'
import type { AdminSection } from '@/types/blogAdmin'

import FormFooter from '../FormFooter.vue'
import MarkdownField from '../MarkdownField.vue'
import RepeatableList from '../RepeatableList.vue'
import { INPUT, LABEL } from '../styles'

// Inicio: introduccion del blog, destacados (proyectos, productos, links) y
// un llamado a la accion opcional. Topes = HomeContent en ulm-core.
const props = defineProps<{ section: AdminSection }>()
const emit = defineEmits<{ saved: [section: AdminSection] }>()

const { draft, dirty, saving, error, saved, save } = useSectionContentForm<HomeContent>(
  () => props.section,
  {
    toPayload: (content) => ({
      ...content,
      highlights: content.highlights.map((h) => ({
        ...h,
        image_url: nullIfBlank(h.image_url),
        url: nullIfBlank(h.url),
      })),
    }),
    onSaved: (section) => emit('saved', section),
  },
)

// Tipada aca: si se escribe en el template, el generico de RepeatableList se
// deduce del literal (image_url: null) y no del tipo de la lista.
const newHighlight = (): HomeContent['highlights'][number] => ({
  kind: 'project',
  title: '',
  description: '',
  image_url: null,
  url: null,
})
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <label class="block">
      <span :class="LABEL">Headline</span>
      <input v-model="draft.headline" :class="INPUT" maxlength="120" aria-label="Headline" />
    </label>

    <MarkdownField v-model="draft.intro" label="Introduction" :maxlength="5000" />

    <RepeatableList
      v-model="draft.highlights"
      label="Highlights"
      noun="highlight"
      :max="12"
      :create="newHighlight"
    >
      <template #default="{ row }">
        <div class="grid gap-2 sm:grid-cols-[9rem_1fr]">
          <select v-model="row.kind" :class="INPUT" aria-label="Highlight kind">
            <option value="project">Project</option>
            <option value="product">Product</option>
            <option value="link">Link</option>
          </select>
          <input
            v-model="row.title"
            :class="INPUT"
            placeholder="Title"
            aria-label="Highlight title"
            maxlength="120"
          />
        </div>
        <textarea
          v-model="row.description"
          :class="INPUT"
          rows="2"
          placeholder="Description"
          aria-label="Highlight description"
          maxlength="500"
        />
        <div class="grid gap-2 sm:grid-cols-2">
          <input
            v-model="row.image_url"
            :class="INPUT"
            type="url"
            placeholder="Image URL (https, optional)"
            aria-label="Highlight image URL"
          />
          <input
            v-model="row.url"
            :class="INPUT"
            type="url"
            placeholder="Link (https, optional)"
            aria-label="Highlight link"
          />
        </div>
      </template>
    </RepeatableList>

    <p class="text-xs text-muted">
      Buttons such as "Write to me" are links now: add them in Blog → Links and enable them in this
      section's Links block.
    </p>

    <FormFooter :dirty="dirty" :saving="saving" :error="error" :saved="saved" />
  </form>
</template>
