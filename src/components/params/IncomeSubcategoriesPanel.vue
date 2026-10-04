<script setup lang="ts">
import { ListTree } from '@lucide/vue'
import { computed, onMounted, ref, shallowRef } from 'vue'

import CatalogList from '@/components/params/CatalogList.vue'
import ConfirmDeleteDialog from '@/components/params/ConfirmDeleteDialog.vue'
import ParamDialog from '@/components/params/ParamDialog.vue'
import { useCatalogPanel } from '@/composables/useCatalogPanel'
import { useIncomeOptions } from '@/composables/useIncomeOptions'
import { ApiError } from '@/lib/http'
import { incomeSourcesApi, incomeSubcategoriesApi } from '@/services/paramsApi'
import type { IncomeSourceAdmin, IncomeSubcategoryAdmin } from '@/types/params'

const incomeOptions = useIncomeOptions()

const panel = useCatalogPanel(incomeSubcategoriesApi, {
  toPayload: (sub: IncomeSubcategoryAdmin) => ({ name: sub.name, source_id: sub.source_id }),
  onChanged: incomeOptions.invalidate,
})
const { dialogOpen, editing, saving, formError, deleting, deleteSaving, deleteError } = panel

// Fuentes (incluidas las archivadas) para agrupar y para elegir en el formulario.
const sources = shallowRef<IncomeSourceAdmin[]>([])
const sourcesError = ref<string | null>(null)

async function loadSources() {
  try {
    sources.value = await incomeSourcesApi.list()
  } catch (err) {
    sourcesError.value = err instanceof ApiError ? err.message : 'Could not load the sources.'
  }
}

function sourceName(sourceId: number): string {
  const source = sources.value.find((s) => s.id === sourceId)
  if (!source) return 'Unknown source'
  return source.status === 'DISABLED' ? `${source.name} (archived)` : source.name
}

// Agrupadas por fuente (en el orden de las fuentes) para que CatalogList ponga
// un encabezado por fuente: el mismo nombre ("EXTRA") puede repetirse en dos.
const sortedItems = computed(() => {
  const order = new Map(sources.value.map((s, index) => [s.id, index]))
  return [...panel.items.value].sort(
    (a, b) => (order.get(a.source_id) ?? 0) - (order.get(b.source_id) ?? 0) || a.id - b.id,
  )
})

const activeSources = computed(() => sources.value.filter((s) => s.status === 'ENABLED'))

const name = ref('')
const sourceId = ref<number | null>(null)

// Una subcategoria con ingresos no cambia de fuente (el backend responde 409).
const sourceLocked = computed(() => (editing.value?.usage_count ?? 0) > 0)

function openCreate() {
  name.value = ''
  sourceId.value = activeSources.value[0]?.id ?? null
  panel.openCreate()
}

function openEdit(sub: IncomeSubcategoryAdmin) {
  name.value = sub.name
  sourceId.value = sub.source_id
  panel.openEdit(sub)
}

function submit() {
  if (sourceId.value === null) return
  panel.save({ name: name.value, source_id: sourceId.value, status: editing.value?.status })
}

onMounted(() => Promise.all([panel.load(), loadSources()]))
</script>

<template>
  <div>
    <CatalogList
      title="Income subcategories"
      add-label="Add subcategory"
      empty-text="No subcategories yet. Each one belongs to a source (e.g. BONUS under Salary)."
      :items="sortedItems"
      :loading="panel.loading.value"
      :error="panel.loadError.value ?? sourcesError"
      :notice="panel.notice.value"
      :group-label="(item) => sourceName(item.source_id)"
      @add="openCreate"
      @edit="openEdit"
      @remove="panel.askDelete"
      @restore="panel.restore"
    >
      <template #visual>
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover">
          <ListTree class="h-4 w-4 text-muted" />
        </span>
      </template>
    </CatalogList>

    <ParamDialog
      :open="dialogOpen"
      :title="editing ? 'Edit subcategory' : 'New subcategory'"
      :saving="saving"
      :error="formError"
      @close="panel.closeDialog"
      @submit="submit"
    >
      <p v-if="!editing && !activeSources.length" class="text-sm text-ruby-text">
        Create a source first: every subcategory belongs to one.
      </p>
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Source *</span>
        <select
          v-model="sourceId"
          required
          :disabled="sourceLocked"
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm disabled:opacity-60"
        >
          <option
            v-for="source in sources"
            :key="source.id"
            :value="source.id"
            :disabled="source.status === 'DISABLED' && source.id !== editing?.source_id"
          >
            {{ sourceName(source.id) }}
          </option>
        </select>
        <span v-if="sourceLocked" class="mt-1 block text-xs text-muted">
          It has records, so it can't move to another source.
        </span>
      </label>
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Name *</span>
        <input
          v-model="name"
          type="text"
          maxlength="120"
          required
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>
    </ParamDialog>

    <ConfirmDeleteDialog
      :item="deleting"
      :saving="deleteSaving"
      :error="deleteError"
      @close="deleting = null"
      @confirm="panel.confirmDelete"
    />
  </div>
</template>
