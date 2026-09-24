<script setup lang="ts">
import { ArrowLeft, ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { ApiError } from '@/lib/http'
import { enableCategory, listCategories, replaceCategories } from '@/services/checklistsApi'
import type { Category, CategoryWrite } from '@/types/checklist'

interface DraftCategory {
  id: number | null
  name: string
}

const original = ref<Category[]>([])
const draft = ref<DraftCategory[]>([])
// Deshabilitadas: de solo lectura, se muestran al final, atenuadas, con su
// propia accion de reactivar (no participan del guardado en bloque de arriba).
const disabledCategories = ref<Category[]>([])

const loading = ref(false)
const saving = ref(false)
const enablingId = ref<number | null>(null)
const error = ref<string | null>(null)

const isDirty = computed(() => {
  const current = original.value.map((c) => ({ id: c.id, name: c.name }))
  const edited = draft.value.map((c) => ({ id: c.id, name: c.name }))
  return JSON.stringify(current) !== JSON.stringify(edited)
})

function toDraft(categories: Category[]): DraftCategory[] {
  return categories.map((c) => ({ id: c.id, name: c.name }))
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const categories = await listCategories(true)
    const enabled = categories.filter((c) => c.status === 'ENABLED')
    original.value = enabled
    draft.value = toDraft(enabled)
    disabledCategories.value = categories.filter((c) => c.status === 'DISABLED')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not load categories.'
  } finally {
    loading.value = false
  }
}

function addCategory() {
  draft.value.push({ id: null, name: '' })
}

function removeCategory(index: number) {
  draft.value.splice(index, 1)
}

function moveUp(index: number) {
  if (index === 0) return
  const [item] = draft.value.splice(index, 1)
  draft.value.splice(index - 1, 0, item)
}

function moveDown(index: number) {
  if (index === draft.value.length - 1) return
  const [item] = draft.value.splice(index, 1)
  draft.value.splice(index + 1, 0, item)
}

function cancel() {
  draft.value = toDraft(original.value)
  error.value = null
}

async function save() {
  error.value = null
  const items: CategoryWrite[] = draft.value
    .map((c) => ({ id: c.id, name: c.name.trim() }))
    .filter((c) => c.name.length > 0)

  saving.value = true
  try {
    const categories = await replaceCategories(items)
    original.value = categories
    draft.value = toDraft(categories)
    // Remover una categoria del guardado en bloque es lo que la deshabilita:
    // recargamos para que aparezca abajo, atenuada.
    await load()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save categories.'
  } finally {
    saving.value = false
  }
}

async function handleEnable(categoryId: number) {
  error.value = null
  enablingId.value = categoryId
  try {
    await enableCategory(categoryId)
    await load()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not re-enable this category.'
  } finally {
    enablingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div>
      <RouterLink
        :to="{ name: 'admin-checklists' }"
        class="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft class="h-4 w-4" />
        Back to checklist
      </RouterLink>
      <h1 class="text-xl font-semibold text-foreground">Manage categories</h1>
      <p class="text-sm text-muted">
        Reorder, rename, add or remove the categories used to organize your checklist template.
        Order here sets priority — the first category has the highest priority.
      </p>
    </div>

    <BaseCard title="Categories">
      <template #actions>
        <BaseButton variant="ghost" type="button" @click="addCategory">
          <Plus class="h-4 w-4" />
          Add category
        </BaseButton>
      </template>

      <p v-if="loading" class="py-6 text-center text-sm text-muted">Loading...</p>

      <template v-else>
        <p
          v-if="!draft.length && !disabledCategories.length"
          class="py-6 text-center text-sm text-muted"
        >
          No categories yet. Add one to get started.
        </p>

        <ul v-else class="space-y-2">
          <li
            v-for="(category, index) in draft"
            :key="category.id ?? `new-${index}`"
            class="flex items-center gap-2"
          >
            <span class="w-6 text-right text-xs text-muted">{{ index + 1 }}</span>
            <input
              v-model="category.name"
              type="text"
              placeholder="Category name"
              class="flex-1 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
            />
            <button
              type="button"
              class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              title="Move up"
              :disabled="index === 0"
              @click="moveUp(index)"
            >
              <ArrowUp class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              title="Move down"
              :disabled="index === draft.length - 1"
              @click="moveDown(index)"
            >
              <ArrowDown class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
              title="Remove"
              @click="removeCategory(index)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </li>

          <!-- Deshabilitadas: atenuadas, al final, sin reordenar/renombrar -->
          <li
            v-for="category in disabledCategories"
            :key="category.id"
            class="flex items-center gap-2 opacity-40"
          >
            <span class="w-6 text-right text-xs text-muted">—</span>
            <span
              class="flex-1 truncate rounded-lg border border-transparent px-3 py-2 text-sm text-muted"
            >
              {{ category.name }}
            </span>
            <BaseButton
              variant="ghost"
              type="button"
              class="opacity-100"
              :disabled="enablingId === category.id"
              @click="handleEnable(category.id)"
            >
              <RotateCcw class="h-4 w-4" />
              {{ enablingId === category.id ? 'Enabling...' : 'Enable' }}
            </BaseButton>
          </li>
        </ul>
      </template>

      <p v-if="error" class="mt-4 text-sm text-ruby-text">{{ error }}</p>

      <div class="mt-6 flex justify-end gap-2 border-t border-subtle pt-4">
        <BaseButton
          variant="secondary"
          type="button"
          :disabled="!isDirty || saving"
          @click="cancel"
        >
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="button" :disabled="!isDirty || saving" @click="save">
          {{ saving ? 'Saving...' : 'Save' }}
        </BaseButton>
      </div>
    </BaseCard>
  </div>
</template>
