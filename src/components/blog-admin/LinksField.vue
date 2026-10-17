<script setup lang="ts">
import type { BlogLink } from '@/types/blog'

import RepeatableList from './RepeatableList.vue'
import { INPUT } from './styles'

// Links de una plantilla (label + URL https; el backend rechaza http).
const links = defineModel<BlogLink[]>({ required: true })

withDefaults(defineProps<{ label?: string; max?: number }>(), { label: 'Links', max: 10 })
</script>

<template>
  <RepeatableList
    v-model="links"
    :label="label"
    noun="link"
    :max="max"
    :create="() => ({ label: '', url: 'https://' })"
  >
    <template #default="{ row }">
      <div class="grid gap-2 sm:grid-cols-[12rem_1fr]">
        <input
          v-model="row.label"
          :class="INPUT"
          placeholder="Label"
          aria-label="Link label"
          maxlength="60"
        />
        <input
          v-model="row.url"
          :class="INPUT"
          type="url"
          placeholder="https://..."
          aria-label="Link URL"
        />
      </div>
    </template>
  </RepeatableList>
</template>
