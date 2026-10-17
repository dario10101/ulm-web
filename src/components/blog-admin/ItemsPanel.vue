<script setup lang="ts">
import { Download, Trash2, Upload } from '@lucide/vue'
import { computed, ref, shallowRef, watch } from 'vue'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { ApiError } from '@/lib/http'
import { move } from '@/lib/reorder'
import {
  deleteItem,
  downloadItemUrl,
  listItems,
  reorderItems,
  updateItem,
  uploadItem,
} from '@/services/blogAdminApi'
import type { CollectionContent } from '@/types/blog'
import type { BlogGroup, BlogItem, ItemUpdate } from '@/types/blogAdmin'

import MoveButtons from './MoveButtons.vue'
import { INPUT } from './styles'

/**
 * Elementos (.md) de una coleccion: subir (uno o varios), publicar, mover de
 * subseccion, descargar el original y borrar. No hay edicion en linea (v1):
 * para cambiar un .md se sube de nuevo y se reemplaza. Lista plana en el
 * orden del admin (manual); las flechas solo aparecen si la coleccion ordena
 * a mano, porque en los otros ordenes la posicion no se usa.
 */
const props = defineProps<{
  sectionId: string
  groups: BlogGroup[]
  sort: CollectionContent['sort']
}>()

const messageOf = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback

const items = shallowRef<BlogItem[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)

async function load() {
  loading.value = true
  listError.value = null
  try {
    items.value = await listItems(props.sectionId)
  } catch (err) {
    listError.value = messageOf(err, 'Could not load the items.')
  } finally {
    loading.value = false
  }
}

// Borrar una subseccion desagrupa sus elementos en el backend: se recarga.
watch(
  () => props.groups.map((g) => g.id).join(),
  () => load(),
  { immediate: true },
)

const groupLabel = computed(() => new Map(props.groups.map((g) => [g.id, g.label])))

// --- Subida ---

interface UploadResult {
  file: File
  status: 'ok' | 'conflict' | 'error'
  message: string
}

const fileInput = ref<HTMLInputElement | null>(null)
const uploadGroup = ref<string>('')
const uploading = ref(false)
const results = ref<UploadResult[]>([])

async function uploadOne(file: File, replace = false): Promise<UploadResult> {
  try {
    const item = await uploadItem(props.sectionId, file, {
      groupId: uploadGroup.value || null,
      replace,
    })
    return {
      file,
      status: 'ok',
      message: replace ? `Replaced "${item.title}"` : `Uploaded "${item.title}" (draft)`,
    }
  } catch (err) {
    const conflict = err instanceof ApiError && err.status === 409
    return {
      file,
      status: conflict ? 'conflict' : 'error',
      message: messageOf(err, 'Upload failed.'),
    }
  }
}

async function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = '' // permite volver a elegir el mismo archivo
  if (!files.length) return
  uploading.value = true
  results.value = []
  // En serie: el tope de elementos y los slugs se validan uno por uno.
  for (const file of files) results.value = [...results.value, await uploadOne(file)]
  uploading.value = false
  await load()
}

async function replace(index: number) {
  uploading.value = true
  const result = await uploadOne(results.value[index].file, true)
  results.value = results.value.map((r, i) => (i === index ? result : r))
  uploading.value = false
  await load()
}

// --- Acciones por elemento ---

const rowError = ref<string | null>(null)

async function patch(item: BlogItem, payload: ItemUpdate) {
  rowError.value = null
  try {
    const updated = await updateItem(props.sectionId, item.id, payload)
    items.value = items.value.map((i) => (i.id === updated.id ? updated : i))
  } catch (err) {
    rowError.value = messageOf(err, 'Could not update the item.')
  }
}

async function reorder(index: number, delta: -1 | 1) {
  rowError.value = null
  try {
    const ids = move(items.value, index, delta).map((i) => i.id)
    items.value = await reorderItems(props.sectionId, ids)
  } catch (err) {
    rowError.value = messageOf(err, 'Could not reorder the items.')
  }
}

const deleting = shallowRef<BlogItem | null>(null)
const deleteError = ref<string | null>(null)
const deleteBusy = ref(false)
const deleteTitle = computed(() => `Delete "${deleting.value?.title ?? ''}"?`)

async function confirmDelete() {
  if (!deleting.value) return
  deleteBusy.value = true
  deleteError.value = null
  try {
    await deleteItem(props.sectionId, deleting.value.id)
    items.value = items.value.filter((i) => i.id !== deleting.value?.id)
    deleting.value = null
  } catch (err) {
    deleteError.value = messageOf(err, 'Could not delete the item.')
  } finally {
    deleteBusy.value = false
  }
}

const FRONTMATTER_EXAMPLE = `---
title: Notes on PySpark window functions   # required
date: 2026-07-18
slug: pyspark-windows      # optional: taken from the file name
excerpt: Short summary for the list.
tags: [Data, PySpark]
cover_url: https://...     # https only
---

# Your markdown here`
</script>

<template>
  <BaseCard title="Items (.md)">
    <template #actions>
      <div class="flex items-center gap-2">
        <select
          v-model="uploadGroup"
          :class="INPUT"
          class="w-auto py-1.5"
          aria-label="Subsection for the upload"
        >
          <option value="">No subsection</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">
            {{ group.label }}
          </option>
        </select>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-cta px-3 py-1.5 text-sm font-medium text-white hover:bg-cta-hover disabled:opacity-50"
          :disabled="uploading"
          @click="fileInput?.click()"
        >
          <Upload class="h-4 w-4" /> {{ uploading ? 'Uploading...' : 'Upload .md' }}
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".md,text/markdown"
          multiple
          class="hidden"
          data-test="file-input"
          @change="onFiles"
        />
      </div>
    </template>

    <details class="mb-4 text-xs text-muted">
      <summary class="cursor-pointer font-medium text-accent-text">File format</summary>
      <p class="mt-2">
        Each file needs a YAML header (frontmatter). Uploads start as drafts; uploading a file with
        a slug that already exists asks before replacing it.
      </p>
      <pre class="mt-2 overflow-x-auto rounded-lg bg-background p-3">{{ FRONTMATTER_EXAMPLE }}</pre>
    </details>

    <ul v-if="results.length" class="mb-4 space-y-1 text-sm" data-test="upload-results">
      <li
        v-for="(result, index) in results"
        :key="result.file.name + index"
        class="flex flex-wrap items-center gap-2"
      >
        <span class="font-medium text-foreground">{{ result.file.name }}</span>
        <span :class="result.status === 'ok' ? 'text-success-text' : 'text-ruby-text'">
          {{ result.message }}
        </span>
        <button
          v-if="result.status === 'conflict'"
          type="button"
          class="text-xs font-medium text-accent-text hover:underline"
          :disabled="uploading"
          @click="replace(index)"
        >
          Replace it
        </button>
      </li>
    </ul>

    <p v-if="listError || rowError" class="mb-2 text-sm text-ruby-text">
      {{ listError || rowError }}
    </p>
    <p v-if="loading && !items.length" class="text-sm text-muted">Loading...</p>
    <p v-else-if="!items.length" class="text-sm text-muted">No items yet. Upload a .md file.</p>

    <ul v-else class="divide-y divide-subtle">
      <li
        v-for="(item, index) in items"
        :key="item.id"
        class="flex flex-wrap items-center gap-x-3 gap-y-2 py-3"
        data-test="item-row"
      >
        <MoveButtons
          v-if="sort === 'manual'"
          :index="index"
          :count="items.length"
          :label="item.title"
          @move="(delta) => reorder(index, delta)"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-foreground">{{ item.title }}</p>
          <p class="truncate text-xs text-muted">
            /{{ item.slug }}<template v-if="item.date"> · {{ item.date }}</template>
            <template v-if="item.group_id && groupLabel.get(item.group_id)">
              · {{ groupLabel.get(item.group_id) }}</template
            >
          </p>
        </div>
        <BaseBadge :tone="item.status === 'published' ? 'accent' : 'neutral'">
          {{ item.status === 'published' ? 'Published' : 'Draft' }}
        </BaseBadge>
        <select
          :value="item.group_id ?? ''"
          :class="INPUT"
          class="w-auto py-1"
          :aria-label="`Subsection of ${item.title}`"
          @change="patch(item, { group_id: ($event.target as HTMLSelectElement).value || null })"
        >
          <option value="">No subsection</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">
            {{ group.label }}
          </option>
        </select>
        <button
          type="button"
          class="rounded-lg border border-subtle px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-hover"
          @click="patch(item, { status: item.status === 'published' ? 'draft' : 'published' })"
        >
          {{ item.status === 'published' ? 'Unpublish' : 'Publish' }}
        </button>
        <a
          :href="downloadItemUrl(sectionId, item.id)"
          download
          class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
          :aria-label="`Download ${item.title}`"
        >
          <Download class="h-4 w-4" />
        </a>
        <button
          type="button"
          class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
          :aria-label="`Delete ${item.title}`"
          @click="((deleting = item), (deleteError = null))"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <ConfirmDialog
      :open="deleting !== null"
      :title="deleteTitle"
      :saving="deleteBusy"
      :error="deleteError"
      @close="deleting = null"
      @confirm="confirmDelete"
    >
      The file is removed from your blog. Download it first if you want to keep a copy.
    </ConfirmDialog>
  </BaseCard>
</template>
