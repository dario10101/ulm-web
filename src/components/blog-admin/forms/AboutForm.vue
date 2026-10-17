<script setup lang="ts">
import { nullIfBlank, useSectionContentForm } from '@/composables/useSectionContentForm'
import type { AboutContent } from '@/types/blog'
import type { AdminSection } from '@/types/blogAdmin'

import FormFooter from '../FormFooter.vue'
import LinksField from '../LinksField.vue'
import MarkdownField from '../MarkdownField.vue'
import { INPUT, LABEL } from '../styles'
import TagsField from '../TagsField.vue'

// Sobre mi: foto, bio, intereses y links. Topes = AboutContent en ulm-core.
const props = defineProps<{ section: AdminSection }>()
const emit = defineEmits<{ saved: [section: AdminSection] }>()

const { draft, dirty, saving, error, saved, save } = useSectionContentForm<AboutContent>(
  () => props.section,
  {
    toPayload: (content) => ({ ...content, photo_url: nullIfBlank(content.photo_url) }),
    onSaved: (section) => emit('saved', section),
  },
)
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <label class="block">
      <span :class="LABEL">Photo URL (https, optional)</span>
      <input v-model="draft.photo_url" :class="INPUT" type="url" aria-label="Photo URL" />
    </label>
    <MarkdownField v-model="draft.bio" label="Bio" :rows="8" :maxlength="10000" />
    <TagsField v-model="draft.interests" label="Interests" :max="20" />
    <LinksField v-model="draft.links" />
    <FormFooter :dirty="dirty" :saving="saving" :error="error" :saved="saved" />
  </form>
</template>
