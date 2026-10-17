<script setup lang="ts">
import { ExternalLink, Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'

import MoveButtons from '@/components/blog-admin/MoveButtons.vue'
import { INPUT, LABEL } from '@/components/blog-admin/styles'
import UsernameRequired from '@/components/blog-admin/UsernameRequired.vue'
import ParamDialog from '@/components/params/ParamDialog.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useAuth } from '@/composables/useAuth'
import { SECTION_TYPE_LABELS } from '@/config/blogSectionEditors'
import { ApiError } from '@/lib/http'
import { move } from '@/lib/reorder'
import {
  createSection,
  deleteSection,
  getBlogSettings,
  listSections,
  reorderSections,
  updateBlogSettings,
  updateSection,
} from '@/services/blogAdminApi'
import type { AdminSection, BlogSettings } from '@/types/blogAdmin'

/**
 * Resumen del blog: ajustes generales y secciones del menu (crear, habilitar
 * con tope, ordenar, borrar). El contenido de cada seccion se edita en su
 * propia pagina (/admin/blog/sections/:id).
 */
const { user } = useAuth()
const router = useRouter()

const messageOf = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback

const settings = shallowRef<BlogSettings | null>(null)
const sections = shallowRef<AdminSection[]>([])
const loadError = ref<string | null>(null)

onMounted(async () => {
  if (!user.value?.username) return
  try {
    const [loadedSettings, loadedSections] = await Promise.all([getBlogSettings(), listSections()])
    settings.value = loadedSettings
    sections.value = loadedSections
    enabled.value = loadedSettings.enabled
    displayName.value = loadedSettings.display_name ?? ''
  } catch (err) {
    loadError.value = messageOf(err, 'Could not load your blog.')
  }
})

// --- Ajustes ---
const enabled = ref(true)
const displayName = ref('')
const settingsSaving = ref(false)
const settingsMessage = ref<{ ok: boolean; text: string } | null>(null)
const settingsDirty = computed(
  () =>
    !!settings.value &&
    (enabled.value !== settings.value.enabled ||
      displayName.value.trim() !== (settings.value.display_name ?? '')),
)

async function saveSettings() {
  settingsSaving.value = true
  settingsMessage.value = null
  try {
    settings.value = await updateBlogSettings({
      enabled: enabled.value,
      display_name: displayName.value.trim() || null,
    })
    settingsMessage.value = { ok: true, text: 'Saved' }
  } catch (err) {
    settingsMessage.value = { ok: false, text: messageOf(err, 'Could not save the settings.') }
  } finally {
    settingsSaving.value = false
  }
}

// --- Secciones ---
const sectionError = ref<string | null>(null)
const enabledCount = computed(() => sections.value.filter((s) => s.enabled).length)
const maxEnabled = computed(() => settings.value?.max_enabled_sections ?? 0)
const atLimit = computed(() => enabledCount.value >= maxEnabled.value)

async function toggle(section: AdminSection) {
  sectionError.value = null
  try {
    const updated = await updateSection(section.id, { enabled: !section.enabled })
    sections.value = sections.value.map((s) => (s.id === updated.id ? updated : s))
  } catch (err) {
    sectionError.value = messageOf(err, 'Could not update the section.')
  }
}

async function reorder(index: number, delta: -1 | 1) {
  sectionError.value = null
  try {
    sections.value = await reorderSections(move(sections.value, index, delta).map((s) => s.id))
  } catch (err) {
    sectionError.value = messageOf(err, 'Could not reorder the sections.')
  }
}

// --- Nueva seccion ---
const createOpen = ref(false)
const newType = ref('')
const newLabel = ref('')
const newSlug = ref('')
const creating = ref(false)
const createError = ref<string | null>(null)

// Los de una sola instancia (Inicio, Sobre mi...) solo si todavia no existen.
const availableTypes = computed(() =>
  (settings.value?.section_types ?? []).filter(
    (t) => !t.singleton || !sections.value.some((s) => s.type === t.type),
  ),
)

function openCreate() {
  newType.value = availableTypes.value[0]?.type ?? ''
  newLabel.value = ''
  newSlug.value = ''
  createError.value = null
  createOpen.value = true
}

async function submitCreate() {
  creating.value = true
  createError.value = null
  try {
    const section = await createSection({
      type: newType.value,
      label: newLabel.value.trim() || null,
      slug: newSlug.value.trim() || null,
    })
    createOpen.value = false
    router.push({ name: 'admin-blog-section', params: { sectionId: section.id } })
  } catch (err) {
    createError.value = messageOf(err, 'Could not create the section.')
  } finally {
    creating.value = false
  }
}

// --- Borrado ---
const deleting = shallowRef<AdminSection | null>(null)
const deleteBusy = ref(false)
const deleteError = ref<string | null>(null)
const deleteTitle = computed(() => `Delete "${deleting.value?.label ?? ''}"?`)

async function confirmDelete() {
  if (!deleting.value) return
  deleteBusy.value = true
  deleteError.value = null
  try {
    await deleteSection(deleting.value.id)
    sections.value = sections.value.filter((s) => s.id !== deleting.value?.id)
    deleting.value = null
  } catch (err) {
    deleteError.value = messageOf(err, 'Could not delete the section.')
  } finally {
    deleteBusy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-foreground">Blog</h1>
        <p class="text-sm text-muted">Sections, content and posts of your public blog.</p>
      </div>
      <RouterLink
        v-if="user?.username"
        :to="{ name: 'blog-home', params: { username: user.username } }"
        target="_blank"
        class="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline"
      >
        /blog/{{ user.username }}
        <ExternalLink class="h-3.5 w-3.5" />
      </RouterLink>
    </div>

    <UsernameRequired v-if="!user?.username" />

    <p v-else-if="loadError" class="text-sm text-ruby-text">{{ loadError }}</p>

    <template v-else-if="settings">
      <BaseCard title="Blog settings">
        <form class="space-y-4" @submit.prevent="saveSettings">
          <label class="flex items-center gap-2 text-sm text-foreground">
            <input v-model="enabled" type="checkbox" class="h-4 w-4 accent-cta" />
            Blog visible to the public
          </label>
          <label class="block max-w-sm">
            <span :class="LABEL">Display name (optional; instead of @{{ user?.username }})</span>
            <input v-model="displayName" :class="INPUT" maxlength="80" aria-label="Display name" />
          </label>
          <div class="flex items-center gap-3">
            <BaseButton type="submit" :disabled="!settingsDirty || settingsSaving">
              {{ settingsSaving ? 'Saving...' : 'Save settings' }}
            </BaseButton>
            <span
              v-if="settingsMessage"
              class="text-sm"
              :class="settingsMessage.ok ? 'text-success-text' : 'text-ruby-text'"
            >
              {{ settingsMessage.text }}
            </span>
          </div>
        </form>
      </BaseCard>

      <BaseCard :title="`Sections · ${enabledCount}/${maxEnabled} enabled`">
        <template #actions>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline disabled:opacity-40"
            :disabled="!availableTypes.length || sections.length >= settings.max_sections"
            @click="openCreate"
          >
            <Plus class="h-4 w-4" /> New section
          </button>
        </template>

        <p class="mb-3 text-xs text-muted">
          The order here is the order of the menu. Public changes can take up to a minute to show
          (cache).
          <template v-if="atLimit">
            You've reached {{ maxEnabled }} enabled sections: disable one to enable another.
          </template>
        </p>
        <p v-if="sectionError" class="mb-2 text-sm text-ruby-text" role="alert">
          {{ sectionError }}
        </p>
        <p v-if="!sections.length" class="text-sm text-muted">
          No sections yet. Create the first one.
        </p>

        <ul v-else class="divide-y divide-subtle">
          <li
            v-for="(section, index) in sections"
            :key="section.id"
            class="flex flex-wrap items-center gap-x-3 gap-y-2 py-3"
            data-test="section-row"
          >
            <MoveButtons
              :index="index"
              :count="sections.length"
              :label="section.label"
              @move="(delta) => reorder(index, delta)"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-foreground">{{ section.label }}</p>
              <p class="text-xs text-muted">
                /{{ section.slug }} · {{ SECTION_TYPE_LABELS[section.type] ?? section.type }}
              </p>
            </div>
            <BaseBadge :tone="section.enabled ? 'accent' : 'neutral'">
              {{ section.enabled ? 'Enabled' : 'Disabled' }}
            </BaseBadge>
            <label
              class="flex items-center gap-1.5 text-xs text-muted"
              :title="
                !section.enabled && atLimit ? `Up to ${maxEnabled} enabled sections` : undefined
              "
            >
              <input
                type="checkbox"
                class="h-4 w-4 accent-cta disabled:opacity-40"
                :checked="section.enabled"
                :disabled="!section.enabled && atLimit"
                :aria-label="`${section.label} enabled`"
                @change="toggle(section)"
              />
              Show
            </label>
            <RouterLink
              :to="{ name: 'admin-blog-section', params: { sectionId: section.id } }"
              class="inline-flex items-center gap-1 rounded-lg border border-subtle px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-hover"
            >
              <Pencil class="h-3.5 w-3.5" /> Edit
            </RouterLink>
            <button
              type="button"
              class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
              :aria-label="`Delete ${section.label}`"
              @click="((deleting = section), (deleteError = null))"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </li>
        </ul>
      </BaseCard>
    </template>

    <ParamDialog
      :open="createOpen"
      title="New section"
      submit-label="Create"
      :saving="creating"
      :error="createError"
      @close="createOpen = false"
      @submit="submitCreate"
    >
      <label class="block">
        <span :class="LABEL">Type</span>
        <select v-model="newType" :class="INPUT" aria-label="Section type">
          <option v-for="t in availableTypes" :key="t.type" :value="t.type">
            {{ SECTION_TYPE_LABELS[t.type] ?? t.type }}
          </option>
        </select>
      </label>
      <label class="block">
        <span :class="LABEL">Menu name (optional)</span>
        <input v-model="newLabel" :class="INPUT" maxlength="40" aria-label="Menu name" />
      </label>
      <label class="block">
        <span :class="LABEL">URL slug (optional, generated if empty)</span>
        <input v-model="newSlug" :class="INPUT" maxlength="40" aria-label="URL slug" />
      </label>
      <p class="text-xs text-muted">New sections start disabled: enable them when they're ready.</p>
    </ParamDialog>

    <ConfirmDialog
      :open="deleting !== null"
      :title="deleteTitle"
      :saving="deleteBusy"
      :error="deleteError"
      @close="deleting = null"
      @confirm="confirmDelete"
    >
      Its content, subsections and uploaded files are deleted too. This can't be undone.
    </ConfirmDialog>
  </div>
</template>
