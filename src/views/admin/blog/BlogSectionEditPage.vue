<script setup lang="ts">
import { ExternalLink, FileQuestion } from '@lucide/vue'
import { computed, ref, shallowRef, watch } from 'vue'

import GroupsPanel from '@/components/blog-admin/GroupsPanel.vue'
import ItemsPanel from '@/components/blog-admin/ItemsPanel.vue'
import { INPUT, LABEL } from '@/components/blog-admin/styles'
import UsernameRequired from '@/components/blog-admin/UsernameRequired.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useAuth } from '@/composables/useAuth'
import { BLOG_SECTION_EDITORS, SECTION_TYPE_LABELS } from '@/config/blogSectionEditors'
import { ApiError } from '@/lib/http'
import { listGroups, listSections, updateSection } from '@/services/blogAdminApi'
import type { CollectionContent } from '@/types/blog'
import type { AdminSection, BlogGroup } from '@/types/blogAdmin'

/**
 * Editor de una seccion: nombre en el menu, URL y visibilidad; el formulario
 * de su plantilla (registro config/blogSectionEditors.ts); y, en las
 * colecciones, subsecciones y .md.
 */
const props = defineProps<{ sectionId: string }>()

const { user } = useAuth()
const messageOf = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback

const section = shallowRef<AdminSection | null>(null)
const groups = shallowRef<BlogGroup[]>([])
const state = ref<'loading' | 'ready' | 'not-found' | 'error'>('loading')
const loadError = ref<string | null>(null)

const editor = computed(() => (section.value ? BLOG_SECTION_EDITORS[section.value.type] : null))

watch(
  () => props.sectionId,
  async (id) => {
    if (!user.value?.username) return
    state.value = 'loading'
    try {
      // No hay GET de una sola seccion: la lista es corta (<= 20).
      const found = (await listSections()).find((s) => s.id === id)
      if (!found || !BLOG_SECTION_EDITORS[found.type]) {
        state.value = 'not-found'
        return
      }
      groups.value = BLOG_SECTION_EDITORS[found.type].hasItems ? await listGroups(found.id) : []
      setSection(found)
      state.value = 'ready'
    } catch (err) {
      loadError.value = messageOf(err, 'Could not load the section.')
      state.value = 'error'
    }
  },
  { immediate: true },
)

// --- Cabecera: nombre, URL, visibilidad ---
const label = ref('')
const slug = ref('')
const enabled = ref(false)
const headerSaving = ref(false)
const headerMessage = ref<{ ok: boolean; text: string } | null>(null)

function setSection(updated: AdminSection) {
  section.value = updated
  label.value = updated.label
  slug.value = updated.slug
  enabled.value = updated.enabled
}

const headerDirty = computed(
  () =>
    !!section.value &&
    (label.value.trim() !== section.value.label ||
      slug.value.trim() !== section.value.slug ||
      enabled.value !== section.value.enabled),
)
const slugChanged = computed(() => !!section.value && slug.value.trim() !== section.value.slug)

async function saveHeader() {
  if (!section.value) return
  headerSaving.value = true
  headerMessage.value = null
  // Solo lo que cambio: habilitar puede chocar con el tope y no deberia
  // impedir un cambio de nombre.
  const payload: { label?: string; slug?: string; enabled?: boolean } = {}
  if (label.value.trim() !== section.value.label) payload.label = label.value.trim()
  if (slugChanged.value) payload.slug = slug.value.trim()
  if (enabled.value !== section.value.enabled) payload.enabled = enabled.value
  try {
    setSection(await updateSection(section.value.id, payload))
    headerMessage.value = { ok: true, text: 'Saved' }
  } catch (err) {
    headerMessage.value = { ok: false, text: messageOf(err, 'Could not save.') }
  } finally {
    headerSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <RouterLink :to="{ name: 'admin-blog' }" class="text-sm text-muted hover:text-accent-text">
      ← Blog sections
    </RouterLink>

    <UsernameRequired v-if="!user?.username" />

    <p v-else-if="state === 'loading'" class="text-sm text-muted">Loading...</p>
    <p v-else-if="state === 'error'" class="text-sm text-ruby-text">{{ loadError }}</p>
    <EmptyState
      v-else-if="state === 'not-found'"
      :icon="FileQuestion"
      title="This section doesn't exist"
      description="It may have been deleted."
    />

    <template v-else-if="section && editor">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold text-foreground">{{ section.label }}</h1>
          <p class="text-sm text-muted">{{ SECTION_TYPE_LABELS[section.type] ?? section.type }}</p>
        </div>
        <RouterLink
          v-if="section.enabled"
          :to="{
            name: 'blog-section',
            params: { username: user.username, section: section.slug },
          }"
          target="_blank"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline"
        >
          View on the blog <ExternalLink class="h-3.5 w-3.5" />
        </RouterLink>
      </div>

      <BaseCard title="Menu">
        <form class="space-y-4" @submit.prevent="saveHeader">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span :class="LABEL">Menu name</span>
              <input
                v-model="label"
                :class="INPUT"
                required
                maxlength="40"
                aria-label="Menu name"
              />
            </label>
            <label class="block">
              <span :class="LABEL">URL: /blog/{{ user.username }}/…</span>
              <input v-model="slug" :class="INPUT" required maxlength="40" aria-label="URL slug" />
            </label>
          </div>
          <p v-if="slugChanged" class="text-xs text-ruby-text">
            Changing the URL breaks links that were already shared.
          </p>
          <label class="flex items-center gap-2 text-sm text-foreground">
            <input v-model="enabled" type="checkbox" class="h-4 w-4 accent-cta" />
            Show in the blog menu
          </label>
          <div class="flex items-center gap-3">
            <BaseButton type="submit" :disabled="!headerDirty || headerSaving">
              {{ headerSaving ? 'Saving...' : 'Save' }}
            </BaseButton>
            <span
              v-if="headerMessage"
              class="text-sm"
              :class="headerMessage.ok ? 'text-success-text' : 'text-ruby-text'"
              role="status"
            >
              {{ headerMessage.text }}
            </span>
          </div>
        </form>
      </BaseCard>

      <BaseCard title="Content">
        <component :is="editor.form" :key="section.id" :section="section" @saved="setSection" />
      </BaseCard>

      <template v-if="editor.hasItems">
        <GroupsPanel :section-id="section.id" :groups="groups" @changed="groups = $event" />
        <ItemsPanel
          :section-id="section.id"
          :groups="groups"
          :sort="(section.content as unknown as CollectionContent).sort"
        />
      </template>
    </template>
  </div>
</template>
