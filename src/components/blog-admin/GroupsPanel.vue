<script setup lang="ts">
import { Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, ref, shallowRef } from 'vue'

import ParamDialog from '@/components/params/ParamDialog.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { ApiError } from '@/lib/http'
import { move } from '@/lib/reorder'
import { createGroup, deleteGroup, reorderGroups, updateGroup } from '@/services/blogAdminApi'
import type { BlogGroup } from '@/types/blogAdmin'

import MoveButtons from './MoveButtons.vue'
import { INPUT, LABEL } from './styles'

/**
 * Subsecciones de una coleccion (ej. Libros -> Ficcion, Tecnicos): encabezados
 * dentro de la seccion publica. Borrar una no borra sus elementos: quedan
 * sin subseccion. La lista la tiene la pagina (ItemsPanel tambien la usa).
 */
const props = defineProps<{ sectionId: string; groups: BlogGroup[] }>()
const emit = defineEmits<{ changed: [groups: BlogGroup[]] }>()

const messageOf = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback

const listError = ref<string | null>(null)

// --- Alta / edicion ---
const dialogOpen = ref(false)
const editing = shallowRef<BlogGroup | null>(null)
const label = ref('')
const description = ref('')
const saving = ref(false)
const formError = ref<string | null>(null)

function openDialog(group: BlogGroup | null) {
  editing.value = group
  label.value = group?.label ?? ''
  description.value = group?.description ?? ''
  formError.value = null
  dialogOpen.value = true
}

async function submit() {
  saving.value = true
  formError.value = null
  const payload = { label: label.value.trim(), description: description.value.trim() || null }
  try {
    if (editing.value) {
      const updated = await updateGroup(props.sectionId, editing.value.id, payload)
      emit(
        'changed',
        props.groups.map((g) => (g.id === updated.id ? updated : g)),
      )
    } else {
      emit('changed', [...props.groups, await createGroup(props.sectionId, payload)])
    }
    dialogOpen.value = false
  } catch (err) {
    formError.value = messageOf(err, 'Could not save the subsection.')
  } finally {
    saving.value = false
  }
}

// --- Orden ---
async function reorder(index: number, delta: -1 | 1) {
  listError.value = null
  try {
    const ids = move(props.groups, index, delta).map((g) => g.id)
    emit('changed', await reorderGroups(props.sectionId, ids))
  } catch (err) {
    listError.value = messageOf(err, 'Could not reorder the subsections.')
  }
}

// --- Borrado ---
const deleting = shallowRef<BlogGroup | null>(null)
const deleteError = ref<string | null>(null)
const deleteTitle = computed(() => `Delete "${deleting.value?.label ?? ''}"?`)

async function confirmDelete() {
  if (!deleting.value) return
  saving.value = true
  deleteError.value = null
  try {
    await deleteGroup(props.sectionId, deleting.value.id)
    emit(
      'changed',
      props.groups.filter((g) => g.id !== deleting.value?.id),
    )
    deleting.value = null
  } catch (err) {
    deleteError.value = messageOf(err, 'Could not delete the subsection.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseCard title="Subsections">
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline"
        @click="openDialog(null)"
      >
        <Plus class="h-4 w-4" /> New subsection
      </button>
    </template>

    <p class="mb-3 text-xs text-muted">
      Optional headings inside this section (e.g. "Fiction", "Technical"). Items can also have no
      subsection.
    </p>
    <p v-if="listError" class="mb-2 text-sm text-ruby-text">{{ listError }}</p>
    <p v-if="!groups.length" class="text-sm text-muted">No subsections.</p>
    <ul v-else class="divide-y divide-subtle">
      <li v-for="(group, index) in groups" :key="group.id" class="flex items-center gap-2 py-2">
        <MoveButtons
          :index="index"
          :count="groups.length"
          :label="group.label"
          @move="(delta) => reorder(index, delta)"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-foreground">{{ group.label }}</p>
          <p v-if="group.description" class="truncate text-xs text-muted">
            {{ group.description }}
          </p>
        </div>
        <button
          type="button"
          class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
          :aria-label="`Edit ${group.label}`"
          @click="openDialog(group)"
        >
          <Pencil class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
          :aria-label="`Delete ${group.label}`"
          @click="((deleting = group), (deleteError = null))"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <ParamDialog
      :open="dialogOpen"
      :title="editing ? 'Edit subsection' : 'New subsection'"
      :saving="saving"
      :error="formError"
      @close="dialogOpen = false"
      @submit="submit"
    >
      <label class="block">
        <span :class="LABEL">Name</span>
        <input
          v-model="label"
          :class="INPUT"
          required
          maxlength="60"
          aria-label="Subsection name"
        />
      </label>
      <label class="block">
        <span :class="LABEL">Description (optional)</span>
        <input
          v-model="description"
          :class="INPUT"
          maxlength="300"
          aria-label="Subsection description"
        />
      </label>
    </ParamDialog>

    <ConfirmDialog
      :open="deleting !== null"
      :title="deleteTitle"
      :saving="saving"
      :error="deleteError"
      @close="deleting = null"
      @confirm="confirmDelete"
    >
      Its items are kept in the section, without a subsection.
    </ConfirmDialog>
  </BaseCard>
</template>
