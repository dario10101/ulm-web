<script setup lang="ts">
import { Tag } from '@lucide/vue'
import { onMounted, ref } from 'vue'

import CatalogList from '@/components/params/CatalogList.vue'
import ColorPicker from '@/components/params/ColorPicker.vue'
import ConfirmDeleteDialog from '@/components/params/ConfirmDeleteDialog.vue'
import ParamDialog from '@/components/params/ParamDialog.vue'
import { useCatalogPanel } from '@/composables/useCatalogPanel'
import { useExpenseOptions } from '@/composables/useExpenseOptions'
import { useIncomeOptions } from '@/composables/useIncomeOptions'
import { financeColorClasses } from '@/config/financeVisuals'
import { tagsApi } from '@/services/paramsApi'
import type { TagAdmin } from '@/types/params'

// Los tags son los mismos para gastos e ingresos: un cambio invalida ambos caches.
const expenseOptions = useExpenseOptions()
const incomeOptions = useIncomeOptions()

const panel = useCatalogPanel(tagsApi, {
  toPayload: (tag: TagAdmin) => ({ name: tag.name, color_key: tag.color_key }),
  onChanged: () => {
    expenseOptions.invalidate()
    incomeOptions.invalidate()
  },
})
const { dialogOpen, editing, saving, formError, deleting, deleteSaving, deleteError } = panel

const name = ref('')
const colorKey = ref('slate')

function openCreate() {
  name.value = ''
  colorKey.value = 'slate'
  panel.openCreate()
}

function openEdit(tag: TagAdmin) {
  name.value = tag.name
  colorKey.value = tag.color_key
  panel.openEdit(tag)
}

function submit() {
  panel.save({ name: name.value, color_key: colorKey.value, status: editing.value?.status })
}

onMounted(panel.load)
</script>

<template>
  <div>
    <CatalogList
      title="Tags"
      add-label="Add tag"
      empty-text="No tags yet. Tags label expenses and incomes across categories (e.g. NEEDED, RECURRING)."
      :items="panel.items.value"
      :loading="panel.loading.value"
      :error="panel.loadError.value"
      :notice="panel.notice.value"
      @add="openCreate"
      @edit="openEdit"
      @remove="panel.askDelete"
      @restore="panel.restore"
    >
      <template #visual="{ item }">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          :class="financeColorClasses(item.color_key).bg"
        >
          <Tag class="h-4 w-4" :class="financeColorClasses(item.color_key).text" />
        </span>
      </template>
    </CatalogList>

    <ParamDialog
      :open="dialogOpen"
      :title="editing ? 'Edit tag' : 'New tag'"
      :saving="saving"
      :error="formError"
      @close="panel.closeDialog"
      @submit="submit"
    >
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Name *</span>
        <input
          v-model="name"
          type="text"
          maxlength="60"
          required
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>
      <div class="text-sm">
        <span class="mb-1.5 block text-muted">Color</span>
        <ColorPicker v-model="colorKey" />
      </div>
      <div class="text-sm">
        <span class="mb-1.5 block text-muted">Preview</span>
        <span
          class="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium"
          :class="[
            financeColorClasses(colorKey).bg,
            financeColorClasses(colorKey).text,
            financeColorClasses(colorKey).border,
          ]"
        >
          {{ name || 'TAG' }}
        </span>
      </div>
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
