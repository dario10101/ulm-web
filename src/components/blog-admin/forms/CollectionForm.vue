<script setup lang="ts">
import { useSectionContentForm } from '@/composables/useSectionContentForm'
import type { CollectionContent } from '@/types/blog'
import type { AdminSection } from '@/types/blogAdmin'

import FormFooter from '../FormFooter.vue'
import MarkdownField from '../MarkdownField.vue'
import { INPUT, LABEL } from '../styles'

// Coleccion: intro y como se listan sus elementos. Las subsecciones y los
// .md se administran aparte (GroupsPanel, ItemsPanel).
const props = defineProps<{ section: AdminSection }>()
const emit = defineEmits<{ saved: [section: AdminSection] }>()

const { draft, dirty, saving, error, saved, save } = useSectionContentForm<CollectionContent>(
  () => props.section,
  { toPayload: (content) => content, onSaved: (section) => emit('saved', section) },
)
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <MarkdownField v-model="draft.intro" label="Introduction" :rows="3" :maxlength="5000" />
    <div class="grid gap-4 sm:grid-cols-2">
      <label class="block">
        <span :class="LABEL">Layout</span>
        <select v-model="draft.layout" :class="INPUT" aria-label="Layout">
          <option value="list">List</option>
          <option value="cards">Cards (with cover image)</option>
        </select>
      </label>
      <label class="block">
        <span :class="LABEL">Order of the items</span>
        <select v-model="draft.sort" :class="INPUT" aria-label="Order">
          <option value="date_desc">Newest first</option>
          <option value="title">By title</option>
          <option value="manual">Manual (arrows below)</option>
        </select>
      </label>
    </div>
    <FormFooter :dirty="dirty" :saving="saving" :error="error" :saved="saved" />
  </form>
</template>
